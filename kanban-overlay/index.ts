import { StringEnum } from "@mariozechner/pi-ai";
import type { ExtensionAPI, ExtensionContext, Theme } from "@mariozechner/pi-coding-agent";
import { matchesKey, truncateToWidth, visibleWidth, Text } from "@mariozechner/pi-tui";
import { Type } from "@sinclair/typebox";

type KanbanMode = "replace" | "append" | "clear" | "list";

interface KanbanBoard {
	todo: string[];
	inProgress: string[];
	done: string[];
}

interface UpdateTasksDetails {
	mode: KanbanMode;
	board: KanbanBoard;
	error?: string;
}

const EMPTY_BOARD: KanbanBoard = { todo: [], inProgress: [], done: [] };

const UpdateTasksParams = Type.Object({
	mode: Type.Optional(
		StringEnum(["replace", "append", "clear", "list"] as const, {
			description: "Update mode. replace (default), append, clear, or list",
		}),
	),
	todo: Type.Optional(Type.Array(Type.String({ description: "Tasks for TODO column" }))),
	in_progress: Type.Optional(Type.Array(Type.String({ description: "Tasks for IN PROGRESS column" }))),
	done: Type.Optional(Type.Array(Type.String({ description: "Tasks for DONE column" }))),
});

function unique(items: string[]): string[] {
	const seen = new Set<string>();
	const out: string[] = [];
	for (const item of items) {
		if (seen.has(item)) continue;
		seen.add(item);
		out.push(item);
	}
	return out;
}

function sanitize(items?: string[]): string[] {
	if (!items) return [];
	return unique(items.map((s) => s.trim()).filter(Boolean));
}

function normalize(board: KanbanBoard): KanbanBoard {
	const done = sanitize(board.done);
	const doneSet = new Set(done);

	const inProgress = sanitize(board.inProgress).filter((item) => !doneSet.has(item));
	const inProgressSet = new Set(inProgress);

	const todo = sanitize(board.todo).filter((item) => !doneSet.has(item) && !inProgressSet.has(item));

	return { todo, inProgress, done };
}

function compactList(items: string[], max: number): string {
	if (items.length === 0) return "—";
	const shown = items.slice(0, max).join(" • ");
	const remaining = items.length - Math.min(items.length, max);
	return remaining > 0 ? `${shown} (+${remaining})` : shown;
}

function formatWorkingMessage(board: KanbanBoard, activity: string): string {
	const counts = `T:${board.todo.length} P:${board.inProgress.length} D:${board.done.length}`;
	const todo = compactList(board.todo, 2);
	const inProgress = compactList(board.inProgress, 2);
	return `📋 ${counts} • ${activity} • todo: ${todo} • doing: ${inProgress}`;
}

function clearWorkingMessage(ctx: ExtensionContext): void {
	if (!ctx.hasUI) return;
	ctx.ui.setWorkingMessage();
}

function updateWorkingMessage(ctx: ExtensionContext, board: KanbanBoard, running: boolean, activity: string): void {
	if (!ctx.hasUI) return;
	if (!running) {
		clearWorkingMessage(ctx);
		return;
	}
	ctx.ui.setWorkingMessage(formatWorkingMessage(board, activity));
}

function reconstructFromSession(ctx: ExtensionContext): KanbanBoard {
	let board = EMPTY_BOARD;
	for (const entry of ctx.sessionManager.getBranch()) {
		if (entry.type !== "message") continue;
		const msg = entry.message;
		if (msg.role !== "toolResult" || msg.toolName !== "update_tasks") continue;
		const details = msg.details as UpdateTasksDetails | undefined;
		if (details?.board) board = details.board;
	}
	return normalize(board);
}

function updateBoard(current: KanbanBoard, params: any): { board: KanbanBoard; mode: KanbanMode; error?: string } {
	const mode: KanbanMode = params.mode ?? "replace";

	if (mode === "list") {
		return { board: current, mode };
	}

	if (mode === "clear") {
		return { board: { todo: [], inProgress: [], done: [] }, mode };
	}

	if (mode === "append") {
		const next: KanbanBoard = {
			todo: [...current.todo, ...sanitize(params.todo)],
			inProgress: [...current.inProgress, ...sanitize(params.in_progress)],
			done: [...current.done, ...sanitize(params.done)],
		};
		return { board: normalize(next), mode };
	}

	if (mode === "replace") {
		const next: KanbanBoard = {
			todo: params.todo ? sanitize(params.todo) : current.todo,
			inProgress: params.in_progress ? sanitize(params.in_progress) : current.inProgress,
			done: params.done ? sanitize(params.done) : current.done,
		};
		return { board: normalize(next), mode };
	}

	return { board: current, mode: "list", error: `Unknown mode: ${mode}` };
}

class KanbanBoardComponent {
	constructor(
		private readonly getBoard: () => KanbanBoard,
		private readonly theme: Theme,
		private readonly onClose: () => void,
	) {}

	handleInput(data: string): void {
		if (matchesKey(data, "escape") || matchesKey(data, "ctrl+c") || matchesKey(data, "return")) {
			this.onClose();
		}
	}

	render(width: number): string[] {
		const board = this.getBoard();
		const th = this.theme;
		const lines: string[] = [];

		if (width < 52) {
			return [
				th.fg("accent", "Kanban Board"),
				th.fg("warning", `TODO (${board.todo.length}): `) + (board.todo.join("; ") || "-"),
				th.fg("accent", `IN PROGRESS (${board.inProgress.length}): `) + (board.inProgress.join("; ") || "-"),
				th.fg("success", `DONE (${board.done.length}): `) + (board.done.join("; ") || "-"),
				th.fg("dim", "Press Enter/Escape to close."),
			];
		}

		const totalWidth = width;
		const inner = totalWidth - 2;
		const colWidth = Math.max(12, Math.floor((inner - 8) / 3));

		const pad = (text: string, len: number) => text + " ".repeat(Math.max(0, len - visibleWidth(text)));
		const row = (a: string, b: string, c: string) =>
			th.fg("border", "│ ") +
			pad(truncateToWidth(a, colWidth), colWidth) +
			th.fg("border", " │ ") +
			pad(truncateToWidth(b, colWidth), colWidth) +
			th.fg("border", " │ ") +
			pad(truncateToWidth(c, colWidth), colWidth) +
			th.fg("border", " │");

		const divider = th.fg("border", `├${"─".repeat(colWidth + 2)}┼${"─".repeat(colWidth + 2)}┼${"─".repeat(colWidth + 2)}┤`);
		const borderTop = th.fg("border", `╭${"─".repeat(inner)}╮`);
		const borderBottom = th.fg("border", `╰${"─".repeat(inner)}╯`);

		lines.push(borderTop);
		lines.push(
			th.fg("border", "│") +
			pad(
				" " +
					th.fg("accent", "Kanban Board") +
					" " +
					th.fg("dim", `(Todo ${board.todo.length} • In Progress ${board.inProgress.length} • Done ${board.done.length})`),
				inner,
			) +
			th.fg("border", "│"),
		);
		lines.push(divider);
		lines.push(
			row(
				th.fg("warning", "TODO"),
				th.fg("accent", "IN PROGRESS"),
				th.fg("success", "DONE"),
			),
		);
		lines.push(divider);

		const rows = Math.max(board.todo.length, board.inProgress.length, board.done.length, 1);
		for (let i = 0; i < rows; i++) {
			const a = board.todo[i] ? `• ${board.todo[i]}` : i === 0 ? th.fg("dim", "—") : "";
			const b = board.inProgress[i] ? `• ${board.inProgress[i]}` : i === 0 ? th.fg("dim", "—") : "";
			const c = board.done[i] ? `• ${board.done[i]}` : i === 0 ? th.fg("dim", "—") : "";
			lines.push(row(a, b, c));
		}

		lines.push(divider);
		lines.push(
			th.fg("border", "│") +
			pad(" " + th.fg("dim", "Use tool: update_tasks. Press Enter/Escape to close."), inner) +
			th.fg("border", "│"),
		);
		lines.push(borderBottom);
		return lines;
	}

	invalidate(): void {}
}

export default function kanbanOverlayExtension(pi: ExtensionAPI): void {
	let board: KanbanBoard = { ...EMPTY_BOARD };
	let isRunning = false;
	let activity = "thinking";

	const rebuild = (ctx: ExtensionContext) => {
		board = reconstructFromSession(ctx);
		updateWorkingMessage(ctx, board, isRunning, activity);
	};

	pi.on("session_start", (_event, ctx) => rebuild(ctx));
	pi.on("session_switch", (_event, ctx) => rebuild(ctx));
	pi.on("session_fork", (_event, ctx) => rebuild(ctx));
	pi.on("session_tree", (_event, ctx) => rebuild(ctx));

	pi.on("agent_start", (_event, ctx) => {
		isRunning = true;
		activity = "thinking";
		updateWorkingMessage(ctx, board, isRunning, activity);
	});

	pi.on("tool_execution_start", (event, ctx) => {
		activity = `${event.toolName}…`;
		updateWorkingMessage(ctx, board, isRunning, activity);
	});

	pi.on("tool_execution_end", (event, ctx) => {
		activity = event.isError ? `${event.toolName} failed` : `${event.toolName} done`;
		updateWorkingMessage(ctx, board, isRunning, activity);
	});

	pi.on("agent_end", (_event, ctx) => {
		isRunning = false;
		clearWorkingMessage(ctx);
	});

	pi.on("session_shutdown", (_event, ctx) => {
		isRunning = false;
		clearWorkingMessage(ctx);
	});

	pi.registerTool({
		name: "update_tasks",
		label: "Update Tasks",
		description:
			"Maintain a kanban board visible in UI. Use mode=replace with todo/in_progress/done arrays to set columns; mode=append to add tasks; mode=clear to reset; mode=list to read current board.",
		parameters: UpdateTasksParams,
		async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
			const next = updateBoard(board, params);
			board = next.board;
			activity = "updated tasks";
			updateWorkingMessage(ctx, board, isRunning, activity);

			const text =
				next.mode === "list"
					? "Current kanban board returned."
					: next.mode === "clear"
						? "Kanban board cleared."
						: `Kanban board updated (${next.mode}).`;

			return {
				content: [
					{
						type: "text",
						text: `${text}\n\nTODO (${board.todo.length}): ${board.todo.join("; ") || "-"}\nIN PROGRESS (${board.inProgress.length}): ${board.inProgress.join("; ") || "-"}\nDONE (${board.done.length}): ${board.done.join("; ") || "-"}`,
					},
				],
				details: {
					mode: next.mode,
					board,
					error: next.error,
				} as UpdateTasksDetails,
			};
		},
		renderCall(args, theme) {
			const mode: KanbanMode = args.mode ?? "replace";
			let text = theme.fg("toolTitle", theme.bold("update_tasks ")) + theme.fg("muted", mode);
			if (Array.isArray(args.todo)) text += theme.fg("dim", ` todo:${args.todo.length}`);
			if (Array.isArray(args.in_progress)) text += theme.fg("dim", ` in_progress:${args.in_progress.length}`);
			if (Array.isArray(args.done)) text += theme.fg("dim", ` done:${args.done.length}`);
			return new Text(text, 0, 0);
		},
		renderResult(result, { expanded }, theme) {
			const details = result.details as UpdateTasksDetails | undefined;
			if (!details) {
				const first = result.content[0];
				return new Text(first?.type === "text" ? first.text : "", 0, 0);
			}

			const b = details.board;
			let text =
				theme.fg("accent", "📋 Kanban ") +
				theme.fg("dim", `T:${b.todo.length} P:${b.inProgress.length} D:${b.done.length}`);
			if (details.error) text += `\n${theme.fg("error", details.error)}`;

			if (expanded) {
				text += `\n\n${theme.fg("warning", "TODO")}: ${b.todo.join("; ") || "-"}`;
				text += `\n${theme.fg("accent", "IN PROGRESS")}: ${b.inProgress.join("; ") || "-"}`;
				text += `\n${theme.fg("success", "DONE")}: ${b.done.join("; ") || "-"}`;
			}

			return new Text(text, 0, 0);
		},
	});

	pi.registerCommand("kanban", {
		description: "Show full kanban board",
		handler: async (_args, ctx) => {
			if (!ctx.hasUI) {
				ctx.ui.notify("/kanban requires interactive UI mode", "warning");
				return;
			}

			await ctx.ui.custom<void>((_tui, theme, _kb, done) => new KanbanBoardComponent(() => board, theme, done));
		},
	});
}
