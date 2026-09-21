#!/usr/bin/env node
/**
 * Printed at the start of every agent session: what the last ones left behind.
 *
 * Running several agents at once, each in its own worktree, the thing that bites is
 * not collisions — it is abandonment. A session ends (a limit, a crash, a closed tab)
 * and leaves a worktree with uncommitted work nobody will look at again, or a dev
 * server holding the port the next agent wants. Both are invisible from inside a new
 * session, which is exactly where a new session starts.
 *
 * Read-only. Prints; never fixes.
 *
 * Wire it to your agent's session-start hook. Configure with:
 *   AGENT_WORKSPACE_ROOTS  colon-separated dirs to scan (default: this repo's parent)
 *   AGENT_WORKSPACE_PORTS  comma-separated ports your dev servers use
 */
import { execFileSync } from "node:child_process";
import { readdirSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const run = (cmd, args, cwd) => {
  try {
    return execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return "";
  }
};

const here = resolve(process.cwd());
const roots = (process.env.AGENT_WORKSPACE_ROOTS ?? join(here, ".."))
  .split(":")
  .map((r) => resolve(r.replace(/^~/, process.env.HOME ?? "~")))
  .filter(existsSync);

const checkouts = [];
for (const root of roots) {
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(root, entry.name);
    if (!existsSync(join(dir, ".git"))) continue;
    checkouts.push(dir);
    // `git worktree list` is the only reliable way to see the other copies: they are
    // not subdirectories and a plain scan never finds them.
    for (const line of run("git", ["worktree", "list", "--porcelain"], dir).split("\n")) {
      if (line.startsWith("worktree ")) {
        const path = line.slice(9);
        if (path !== dir && existsSync(path)) checkouts.push(path);
      }
    }
  }
}

const unfinished = [];
for (const dir of [...new Set(checkouts)]) {
  // --no-optional-locks so this never fights a running agent for the index lock.
  const dirty = run("git", ["--no-optional-locks", "status", "--porcelain"], dir);
  if (!dirty) continue;
  const branch = run("git", ["--no-optional-locks", "branch", "--show-current"], dir) || "detached";
  unfinished.push({ dir, branch, files: dirty.split("\n").length });
}

const ports = (process.env.AGENT_WORKSPACE_PORTS ?? "")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);
const listening = [];
for (const port of ports) {
  const out = run("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"]);
  const line = out.split("\n")[1];
  if (line) listening.push({ port, process: line.split(/\s+/)[0], pid: line.split(/\s+/)[1] });
}

if (!unfinished.length && !listening.length) {
  console.log("Nothing unfinished on this machine.");
  process.exit(0);
}

console.log("Left behind by earlier sessions. Finish it or hand it over before starting anything new:");
for (const item of unfinished.sort((a, b) => b.files - a.files).slice(0, 8)) {
  console.log(`  ${item.branch}: ${item.files} uncommitted file(s) · ${item.dir}`);
}
for (const item of listening) {
  console.log(`  port ${item.port} is held by ${item.process} (pid ${item.pid}) — a server nobody stopped`);
}
