/**
 * Shared scaffolding for the tests: a throwaway directory per case, and a way to run
 * one of the repository's scripts as the real thing — a child process with its own
 * cwd, environment and PATH — rather than by importing it.
 *
 * Importing would test the functions. Spawning tests the file the hook configuration
 * actually points at, including its shebang, its argument parsing and its exit code.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..");

/** A temporary directory that removes itself when the test ends. */
export function tempDir(t, prefix = "agent-workspace-starter-") {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  // macOS hands out /var/... which is a symlink to /private/var. Scripts that compare
  // a resolved path against this one would disagree with themselves without this.
  return execFileSync("/bin/pwd", { cwd: dir, encoding: "utf8" }).trim();
}

/** Run one of this repository's scripts. Never throws; the result carries the failure. */
export function runScript(relativePath, args = [], options = {}) {
  const result = spawnSync(process.execPath, [join(REPO, relativePath), ...args], {
    encoding: "utf8",
    ...options,
    env: { ...process.env, ...(options.env ?? {}) },
  });
  return {
    status: result.status,
    stdout: result.stdout ?? "",
    stderr: result.stderr ?? "",
    all: `${result.stdout ?? ""}${result.stderr ?? ""}`,
  };
}

/** Write a file, creating the directories above it. */
export function write(path, contents) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, contents);
  return path;
}

/** A git repository with one commit, so `git rev-parse --show-toplevel` has an answer. */
export function gitRepo(dir, files = { "README.md": "seed\n" }) {
  const git = (...args) =>
    execFileSync("git", args, {
      cwd: dir,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
      env: {
        ...process.env,
        GIT_AUTHOR_NAME: "test",
        GIT_AUTHOR_EMAIL: "test@example.invalid",
        GIT_COMMITTER_NAME: "test",
        GIT_COMMITTER_EMAIL: "test@example.invalid",
      },
    });
  mkdirSync(dir, { recursive: true });
  git("init", "-q", "-b", "main");
  for (const [name, contents] of Object.entries(files)) write(join(dir, name), contents);
  git("add", "-A");
  git("commit", "-qm", "seed");
  return git;
}
