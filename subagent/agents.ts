/**
 * Agent discovery and configuration
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { getAgentDir, parseFrontmatter } from "@mariozechner/pi-coding-agent";

export type AgentScope = "user" | "project" | "both";

export type TaskAccess = "none" | "read" | "write";

export interface AgentConfig {
	name: string;
	description: string;
	tools?: string[];
	model?: string;
	taskAccess: TaskAccess;
	systemPrompt: string;
	source: "user" | "project";
	filePath: string;
}

export interface AgentDiscoveryResult {
	agents: AgentConfig[];
	projectAgentsDir: string | null;
}

function parseCsvList(value?: string): string[] | undefined {
	if (!value) return undefined;
	const items = value
		.split(",")
		.map((item) => item.trim())
		.filter(Boolean);
	return items.length > 0 ? items : undefined;
}

function parseTaskAccess(value?: string): TaskAccess {
	const normalized = (value ?? "read").trim().toLowerCase();
	if (normalized === "none" || normalized === "read" || normalized === "write") {
		return normalized;
	}
	return "read";
}

function loadAgentsFromDir(dir: string, source: "user" | "project"): AgentConfig[] {
	const agents: AgentConfig[] = [];

	if (!fs.existsSync(dir)) {
		return agents;
	}

	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch {
		return agents;
	}

	for (const entry of entries) {
		if (!entry.name.endsWith(".md")) continue;
		if (!entry.isFile() && !entry.isSymbolicLink()) continue;

		const filePath = path.join(dir, entry.name);
		let content: string;
		try {
			content = fs.readFileSync(filePath, "utf-8");
		} catch {
			continue;
		}

		const { frontmatter, body } = parseFrontmatter<Record<string, string>>(content);

		if (!frontmatter.name || !frontmatter.description) {
			continue;
		}

		const tools = parseCsvList(frontmatter.tools);
		const taskAccess = parseTaskAccess(frontmatter.task_access);

		agents.push({
			name: frontmatter.name,
			description: frontmatter.description,
			tools,
			model: frontmatter.model,
			taskAccess,
			systemPrompt: body,
			source,
			filePath,
		});
	}

	return agents;
}

function isDirectory(p: string): boolean {
	try {
		return fs.statSync(p).isDirectory();
	} catch {
		return false;
	}
}

function findNearestProjectAgentsDir(cwd: string): string | null {
	let currentDir = cwd;
	while (true) {
		const candidate = path.join(currentDir, ".pi", "agents");
		if (isDirectory(candidate)) return candidate;

		const parentDir = path.dirname(currentDir);
		if (parentDir === currentDir) return null;
		currentDir = parentDir;
	}
}

export function discoverAgents(cwd: string, scope: AgentScope): AgentDiscoveryResult {
	const userDir = path.join(getAgentDir(), "agents");
	const projectAgentsDir = findNearestProjectAgentsDir(cwd);

	const shouldLoadUser = scope !== "project";
	const shouldLoadProject = scope !== "user" && Boolean(projectAgentsDir);

	const userAgents = shouldLoadUser ? loadAgentsFromDir(userDir, "user") : [];
	const projectAgents = shouldLoadProject && projectAgentsDir ? loadAgentsFromDir(projectAgentsDir, "project") : [];

	// For scope="both", project agents intentionally override user agents with the same name.
	const merged = new Map<string, AgentConfig>();
	for (const agent of userAgents) merged.set(agent.name, agent);
	for (const agent of projectAgents) merged.set(agent.name, agent);

	const agents = Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
	return { agents, projectAgentsDir };
}

export function formatAgentList(agents: AgentConfig[], maxItems: number): { text: string; remaining: number } {
	if (agents.length === 0) return { text: "none", remaining: 0 };
	const listed = agents.slice(0, maxItems);
	const remaining = agents.length - listed.length;
	return {
		text: listed.map((a) => `${a.name} (${a.source}, tasks:${a.taskAccess}): ${a.description}`).join("; "),
		remaining,
	};
}
