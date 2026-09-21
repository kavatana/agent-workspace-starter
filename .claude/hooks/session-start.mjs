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
 * It reports one of three states, and never a fourth:
 *
 *   unfinished   — these checkouts have uncommitted work, these ports are held
 *   clean        — nothing unfinished, in this many checkouts it actually read
 *   not checked  — something stopped the check, and the reason is printed
 *
 * The third state is the whole point of this file. A command that fails is never
 * reported as "nothing found": git missing from PATH, a scan root that was moved
 * months ago and a `git status` that could not run all used to come out as a
 * confident "Nothing unfinished on this machine", which is the one sentence a new
 * session reads and believes.
 *
 * Read-only. Prints; never fixes. Always exits 0 — a hook that fails is a hook that
 * gets taken out of the configuration.
 *
 * Wire it to your agent's session-start hook (the README has the exact JSON).
 * Configure with:
 *   AGENT_WORKSPACE_ROOTS  colon-separated dirs to scan
 *                          (default: the parent of this repository's root)
 *   AGENT_WORKSPACE_PORTS  comma-separated ports your dev servers use
 */
import { execFileSync } from "node:child_process";
import { readdirSync, existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";

/**
 * Run a command and say whether it ran. The old version returned "" for both "the
 * command printed nothing" and "the command does not exist", which is how a machine
 * with no git reported a clean workspace.
 */
const run = (cmd, args, cwd) => {
  try {
    const out = execFileSync(cmd, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    return { ok: true, out: out.trim() };
  } catch (error) {
    const stderr = (error.stderr ?? "").toString().trim();
    return {
      ok: false,
      out: "",
      code: error.code,
      status: error.status,
      stderr,
      why:
        error.code === "ENOENT"
          ? `${cmd} is not on PATH`
          : stderr.split("\n")[0] || `${cmd} exited ${error.status ?? "abnormally"}`,
    };
  }
};

const notChecked = [];
const expand = (p) => resolve(p.startsWith("~") ? join(homedir(), p.slice(1)) : p);
const isDirectory = (p) => {
  try {
    return statSync(p).isDirectory();
  } catch {
    return false;
  }
};

// ---------------------------------------------------------------- where to look

const roots = [];
const git = run("git", ["--version"]);
if (!git.ok) {
  notChecked.push(`checkouts: ${git.why}`);
} else {
  const configured = (process.env.AGENT_WORKSPACE_ROOTS ?? "").trim();
  if (configured) {
    for (const entry of configured.split(":").map((s) => s.trim()).filter(Boolean)) {
      const dir = expand(entry);
      if (isDirectory(dir)) roots.push(dir);
      else notChecked.push(`${dir}: the scan root does not exist`);
    }
  } else {
    // Not the parent of the cwd: a session that starts in src/lib/thing has a cwd
    // whose parent is still inside this repository, so the scan finds one checkout,
    // or none, and reports success either way. Ask git where the repository begins.
    const top = run("git", ["rev-parse", "--show-toplevel"], process.cwd());
    if (top.ok && top.out) roots.push(dirname(resolve(top.out)));
    else {
      notChecked.push(
        `checkouts: ${process.cwd()} is not inside a git repository and AGENT_WORKSPACE_ROOTS is not set`,
      );
    }
  }
}

// ---------------------------------------------------------------- what is there

const checkouts = [];
for (const root of roots) {
  let entries;
  try {
    entries = readdirSync(root, { withFileTypes: true });
  } catch (error) {
    notChecked.push(`${root}: ${error.code ?? error.message}`);
    continue;
  }
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(root, entry.name);
    if (!existsSync(join(dir, ".git"))) continue;
    checkouts.push(dir);
    // `git worktree list` is the only reliable way to see the other copies: they are
    // not subdirectories and a plain scan never finds them.
    const list = run("git", ["--no-optional-locks", "worktree", "list", "--porcelain"], dir);
    if (!list.ok) {
      notChecked.push(`${dir}: its worktrees were not listed — ${list.why}`);
      continue;
    }
    for (const line of list.out.split("\n")) {
      if (!line.startsWith("worktree ")) continue;
      const other = line.slice("worktree ".length);
      if (other !== dir && existsSync(other)) checkouts.push(other);
    }
  }
}

const unfinished = [];
const read = [...new Set(checkouts)];
for (const dir of read) {
  // --no-optional-locks so this never fights a running agent for the index lock.
  const dirty = run("git", ["--no-optional-locks", "status", "--porcelain"], dir);
  if (!dirty.ok) {
    notChecked.push(`${dir}: git status failed — ${dirty.why}`);
    continue;
  }
  if (!dirty.out) continue;
  const branch = run("git", ["--no-optional-locks", "branch", "--show-current"], dir);
  unfinished.push({
    dir,
    branch: (branch.ok && branch.out) || "detached",
    files: dirty.out.split("\n").length,
  });
}

const ports = (process.env.AGENT_WORKSPACE_PORTS ?? "")
  .split(",")
  .map((p) => p.trim())
  .filter(Boolean);
const listening = [];
for (const port of ports) {
  const out = run("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN"]);
  if (!out.ok) {
    if (out.code === "ENOENT") {
      notChecked.push(`ports: ${out.why}, so nothing was asked about ${ports.join(", ")}`);
      break;
    }
    // lsof exits 1 with nothing on stderr when no process matches. That is an answer.
    if (out.status === 1 && !out.stderr) continue;
    notChecked.push(`port ${port}: lsof failed — ${out.why}`);
    continue;
  }
  const line = out.out.split("\n")[1];
  if (line) listening.push({ port, process: line.split(/\s+/)[0], pid: line.split(/\s+/)[1] });
}

// ---------------------------------------------------------------- say it plainly

const lines = [];
if (unfinished.length || listening.length) {
  lines.push("Left behind by earlier sessions. Finish it or hand it over before starting anything new:");
  for (const item of unfinished.sort((a, b) => b.files - a.files).slice(0, 8)) {
    lines.push(`  ${item.branch}: ${item.files} uncommitted file(s) · ${item.dir}`);
  }
  for (const item of listening) {
    lines.push(`  port ${item.port} is held by ${item.process} (pid ${item.pid}) — a server nobody stopped`);
  }
} else if (notChecked.length) {
  // Never "nothing unfinished on this machine" when part of the machine went unread.
  lines.push(`Nothing unfinished in the ${read.length} checkout(s) that could be read — and some could not be:`);
} else {
  lines.push(`Nothing unfinished in ${read.length} checkout(s) on this machine.`);
}

if (notChecked.length) {
  lines.push("Not checked:");
  for (const why of notChecked) lines.push(`  ${why}`);
}

console.log(lines.join("\n"));
