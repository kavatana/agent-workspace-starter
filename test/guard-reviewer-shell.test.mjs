/**
 * The deep reviewer has a shell. This guard is what stops that shell from being a
 * write tool. Every case here is a command a reviewer might plausibly reach for, and
 * the decision the guard has to reach about it.
 *
 * The guard errs towards denying: anything it cannot read, it refuses.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { REPO, tempDir } from "../scripts/lib/fixtures.mjs";

const GUARD = join(REPO, ".claude/hooks/guard-reviewer-shell.mjs");

/** Ask the guard about one command, the way Claude Code asks it: JSON on stdin. */
function ask(command, { scratch = "/tmp/scratch", cwd = "/repo", toolName = "Bash" } = {}) {
  const result = spawnSync(process.execPath, [GUARD], {
    input: JSON.stringify({
      hook_event_name: "PreToolUse",
      tool_name: toolName,
      tool_input: { command },
      cwd,
      scratchpad_dir: scratch,
    }),
    encoding: "utf8",
  });
  assert.equal(result.status, 0, `the guard must exit 0 whatever it decides: ${result.stderr}`);
  const stdout = result.stdout.trim();
  if (!stdout) return { decision: null };
  const parsed = JSON.parse(stdout);
  const out = parsed.hookSpecificOutput ?? {};
  assert.equal(out.hookEventName, "PreToolUse");
  return { decision: out.permissionDecision, reason: out.permissionDecisionReason ?? "" };
}

const denies = (command, options) => {
  const { decision, reason } = ask(command, options);
  assert.equal(decision, "deny", `expected a refusal of: ${command}`);
  assert.ok(reason.length > 0, "a refusal has to say why");
  return reason;
};

const allows = (command, options) => {
  const { decision } = ask(command, options);
  assert.equal(decision, null, `expected no decision on: ${command}`);
};

test("reading is left alone, so the normal permission system decides", () => {
  for (const command of [
    "git log --oneline -20",
    "git diff origin/main...HEAD",
    "git status --porcelain",
    "npm test",
    "node --test",
    "rg -n 'TODO' src/",
    "cat package.json",
    "ls -la src",
    "gh pr view 12 --json title,body",
    "gh pr diff 12",
  ]) {
    allows(command);
  }
});

test("it refuses the git subcommands that change history, the remote or the shared stash", () => {
  for (const command of [
    "git push",
    "git push --force origin main",
    "git commit -m 'fix'",
    "git merge origin/main",
    "git reset --hard HEAD~1",
    "git stash",
  ]) {
    denies(command);
  }
});

test("git's global options do not smuggle a push past it", () => {
  denies("git -C /repo push origin main");
  denies("git --git-dir=/repo/.git --work-tree=/repo commit -m x");
  denies("git -c user.name=x commit -m x");
});

test("it refuses the gh commands that write to a pull request", () => {
  denies("gh pr merge 12 --squash");
  denies("gh pr comment 12 --body 'looks good'");
  denies("gh pr edit 12 --title 'x'");
});

test("it refuses rm, wherever rm is spelled from", () => {
  denies("rm -rf build");
  denies("/bin/rm file.txt");
  denies("find . -name '*.log' -delete; rm -r node_modules");
});

test("it refuses redirection to anywhere but the scratch directory", (t) => {
  const scratch = tempDir(t);
  denies("node -e 'console.log(1)' > notes.txt", { scratch });
  denies("git diff > /repo/review.patch", { scratch });
  denies("echo hi >> ../elsewhere/file", { scratch });
  denies("npm test 2> errors.log", { scratch });
  allows(`npm test > ${scratch}/out.log`, { scratch });
  allows(`npm test 2>&1 > ${scratch}/out.log`, { scratch });
  allows("npm test > /dev/null 2>&1", { scratch });
});

test("relative redirection is resolved against the session's directory, not the guard's", (t) => {
  const scratch = tempDir(t);
  // `cd`-ing into the scratch directory does not make a bare filename safe: the guard
  // has no way to follow a cd, so it reads the path from where the session started.
  denies("echo x > out.log", { scratch, cwd: "/repo" });
});

test("it refuses commands that write to a path outside the scratch directory", (t) => {
  const scratch = tempDir(t);
  denies("cp src/a.ts src/b.ts", { scratch });
  denies("mv src/a.ts src/b.ts", { scratch });
  denies("mkdir build", { scratch });
  denies("touch src/new.ts", { scratch });
  denies("chmod +x scripts/thing.sh", { scratch });
  denies("sed -i '' 's/a/b/' src/a.ts", { scratch });
  denies("tee src/a.ts", { scratch });
  denies("dd if=/dev/zero of=/repo/big", { scratch });
  allows(`cp src/a.ts ${scratch}/a.ts`, { scratch });
  allows(`mkdir -p ${scratch}/work`, { scratch });
});

test("it refuses anything that hides what will run", (t) => {
  const scratch = tempDir(t);
  denies("bash -c 'rm -rf build'", { scratch });
  denies("sh scripts/deploy.sh", { scratch });
  denies("eval \"$DANGEROUS\"", { scratch });
  denies("sudo npm install -g something", { scratch });
  denies("xargs rm < list.txt", { scratch });
  denies("echo $(git push)", { scratch });
  denies("echo `git push`", { scratch });
  denies("cat <<EOF > file\nhi\nEOF", { scratch });
});

test("it refuses a command it cannot parse rather than guessing", () => {
  denies("echo 'unbalanced");
  denies('echo "still unbalanced');
});

test("it says nothing about tools that are not the shell", () => {
  allows("anything at all", { toolName: "Read" });
});

test("malformed hook input is refused, not waved through", () => {
  const result = spawnSync(process.execPath, [GUARD], { input: "not json", encoding: "utf8" });
  assert.equal(result.status, 0);
  assert.match(result.stdout, /"permissionDecision": ?"deny"/);
});

test("the reason names the rule, so the reviewer knows what to do instead", () => {
  assert.match(denies("git push"), /push/);
  assert.match(denies("rm -rf build"), /rm/);
});
