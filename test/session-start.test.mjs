/**
 * The session-start hook is read at the top of every session and believed. The only
 * unforgivable output is a confident "nothing unfinished" produced by a check that did
 * not run. Every case here is one of those.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { gitRepo, runScript, tempDir, write } from "../scripts/lib/fixtures.mjs";

const hook = (options) => runScript(".claude/hooks/session-start.mjs", [], options);

/** A scan root holding one repository with uncommitted work in it. */
function rootWithDirtyRepo(t) {
  const root = tempDir(t);
  const repo = join(root, "a-project");
  gitRepo(repo);
  writeFileSync(join(repo, "README.md"), "edited but never committed\n");
  return { root, repo };
}

test("it finds uncommitted work under a configured root", (t) => {
  const { root } = rootWithDirtyRepo(t);
  const result = hook({ cwd: root, env: { AGENT_WORKSPACE_ROOTS: root, AGENT_WORKSPACE_PORTS: "" } });
  assert.match(result.stdout, /a-project/);
  assert.match(result.stdout, /1 uncommitted file/);
});

test("a session started in a subdirectory still scans from the repository root", (t) => {
  const { root, repo } = rootWithDirtyRepo(t);
  const nested = join(repo, "src", "deep", "deeper");
  mkdirSync(nested, { recursive: true });

  // No AGENT_WORKSPACE_ROOTS: the hook has to work out where it is. Walking up one
  // directory from the cwd lands inside the repository and finds nothing, then says so.
  const result = hook({ cwd: nested, env: { AGENT_WORKSPACE_ROOTS: "", AGENT_WORKSPACE_PORTS: "" } });
  assert.match(result.stdout, /a-project/, "the dirty checkout is one repository up from the cwd");
  assert.doesNotMatch(result.stdout, /Nothing unfinished/);
});

test("with git missing it says it did not check, and never says clean", (t) => {
  const { root } = rootWithDirtyRepo(t);
  const empty = mkdtempSync(join(tempDir(t), "no-tools-"));
  const result = hook({
    cwd: root,
    env: { PATH: empty, AGENT_WORKSPACE_ROOTS: root, AGENT_WORKSPACE_PORTS: "" },
  });
  assert.doesNotMatch(result.stdout, /Nothing unfinished on this machine/);
  assert.match(result.stdout, /not checked/i);
  assert.match(result.stdout, /git/i, "it must say what was missing");
});

test("a scan root that does not exist is reported, not skipped in silence", (t) => {
  const root = tempDir(t);
  const gone = join(root, "this-was-moved-months-ago");
  const result = hook({ cwd: root, env: { AGENT_WORKSPACE_ROOTS: gone, AGENT_WORKSPACE_PORTS: "" } });
  assert.doesNotMatch(result.stdout, /Nothing unfinished on this machine/);
  assert.match(result.stdout, /not checked/i);
  assert.match(result.stdout, /this-was-moved-months-ago/);
});

test("one bad root among good ones does not hide the good ones' findings", (t) => {
  const { root } = rootWithDirtyRepo(t);
  const gone = join(root, "not-here");
  const result = hook({
    cwd: root,
    env: { AGENT_WORKSPACE_ROOTS: `${root}:${gone}`, AGENT_WORKSPACE_PORTS: "" },
  });
  assert.match(result.stdout, /a-project/);
  assert.match(result.stdout, /not-here/);
});

test("clean is claimed only over checkouts it actually read, and says how many", (t) => {
  const root = tempDir(t);
  gitRepo(join(root, "tidy-project"));
  const result = hook({ cwd: root, env: { AGENT_WORKSPACE_ROOTS: root, AGENT_WORKSPACE_PORTS: "" } });
  assert.match(result.stdout, /Nothing unfinished/);
  assert.match(result.stdout, /1 checkout/, "a clean claim has to say what it covered");
  assert.doesNotMatch(result.stdout, /not checked/i);
});

test("a worktree of a scanned repository is scanned too", (t) => {
  const root = tempDir(t);
  const repo = join(root, "a-project");
  const git = gitRepo(repo);
  const tree = join(root, "elsewhere", "wt");
  mkdirSync(join(root, "elsewhere"), { recursive: true });
  git("worktree", "add", "-q", "-b", "side", tree);
  write(join(tree, "unsaved.txt"), "left behind\n");

  const result = hook({ cwd: root, env: { AGENT_WORKSPACE_ROOTS: root, AGENT_WORKSPACE_PORTS: "" } });
  assert.match(result.stdout, /side: 1 uncommitted file/);
});

test("it always exits zero, because a hook that fails costs the session its context", (t) => {
  const root = tempDir(t);
  for (const env of [
    { AGENT_WORKSPACE_ROOTS: join(root, "nope") },
    { AGENT_WORKSPACE_ROOTS: root },
  ]) {
    assert.equal(hook({ cwd: root, env: { ...env, AGENT_WORKSPACE_PORTS: "" } }).status, 0);
  }
});
