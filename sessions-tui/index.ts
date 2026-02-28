import { SessionManager, SessionSelectorComponent, type ExtensionAPI, type ExtensionCommandContext } from "@mariozechner/pi-coding-agent";

type SessionPickResult = {
	selectedPath?: string;
	cancelled: boolean;
};

function notify(ctx: ExtensionCommandContext, message: string, type: "info" | "warning" = "info"): void {
	if (ctx.hasUI) {
		ctx.ui.notify(message, type);
		return;
	}

	console.warn(`[sessions] ${message}`);
}

async function pickSession(ctx: ExtensionCommandContext): Promise<SessionPickResult> {
	const selectedPath = await ctx.ui.custom<string | undefined>((tui, _theme, keybindings, done) => {
		const selector = new SessionSelectorComponent(
			(onProgress) => SessionManager.list(ctx.sessionManager.getCwd(), ctx.sessionManager.getSessionDir(), onProgress),
			SessionManager.listAll,
			(sessionPath) => done(sessionPath),
			() => done(undefined),
			() => done(undefined),
			() => tui.requestRender(),
			{
				showRenameHint: false,
				keybindings,
			},
			ctx.sessionManager.getSessionFile(),
		);

		return selector;
	});

	if (!selectedPath) {
		return { cancelled: true };
	}

	return {
		selectedPath,
		cancelled: false,
	};
}

async function handleSessionsCommand(ctx: ExtensionCommandContext): Promise<void> {
	if (!ctx.hasUI) {
		notify(ctx, "Session picker requires interactive UI mode.", "warning");
		return;
	}

	const currentSessionPath = ctx.sessionManager.getSessionFile();
	const result = await pickSession(ctx);

	if (result.cancelled || !result.selectedPath) {
		notify(ctx, "Session switch cancelled.");
		return;
	}

	if (currentSessionPath && result.selectedPath === currentSessionPath) {
		notify(ctx, "Already in this session.");
		return;
	}

	const switched = await ctx.switchSession(result.selectedPath);
	if (switched.cancelled) {
		notify(ctx, "Session switch cancelled.");
		return;
	}

	notify(ctx, "Resumed selected session.");
}

export default function sessionsExtension(pi: ExtensionAPI): void {
	const command = {
		description: "Open session picker and switch sessions",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			await handleSessionsCommand(ctx);
		},
	};

	pi.registerCommand("sessions", command);
}
