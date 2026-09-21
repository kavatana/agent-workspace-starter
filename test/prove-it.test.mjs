/**
 * `/prove-it` takes a file away and puts it back. The skill used to do that itself, in
 * prose, and checked its work with `git status --porcelain` — which is byte-for-byte
 * identical for a file that was already modified and has now been modified differently.
 * Nothing recovered an interrupted run at all.
 *
 * So the file-juggling moved here, where it can be proved. These cases are the ways it
 * could lose someone's work.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { chmodSync, existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { REPO, gitRepo, runScript, tempDir, write } from "../scripts/lib/fixtures.mjs";

const PROTECTED = "src/thing.mjs";
const WITH_RETRY = "export const send = (n) => (n < 3 ? 'RETRY' : 'give up');\n";
const WITHOUT_RETRY = "export const send = () => 'give up';\n";

// A check that goes red exactly when the retry branch is gone. It is the stand-in for
// the repository's own suite.
const CHECK = `
import { send } from "./src/thing.mjs";
if (send(1) !== "RETRY") { console.error("expected RETRY"); process.exit(1); }
`;

const sha = (path) => createHash("sha256").update(readFileSync(path)).digest("hex");

function project(t) {
  const dir = tempDir(t);
  gitRepo(dir, { [PROTECTED]: WITH_RETRY, "check.mjs": CHECK, "README.md": "seed\n" });
  return dir;
}

function proveIt(dir, args) {
  const result = runScript("scripts/prove-it.mjs", args, { cwd: dir });
  const start = result.stdout.indexOf("{");
  return {
    ...result,
    json: start === -1 ? null : JSON.parse(result.stdout.slice(start)),
  };
}

const storeEntries = (dir) => (existsSync(join(dir, ".prove-it")) ? readdirSync(join(dir, ".prove-it")) : []);

test("a mutation that breaks the test is reported as biting, and is put back", (t) => {
  const dir = project(t);
  const before = sha(join(dir, PROTECTED));
  const mutated = write(join(dir, "mutated.mjs"), WITHOUT_RETRY);

  const result = proveIt(dir, ["--file", PROTECTED, "--with", mutated, "--test", "node check.mjs"]);

  assert.equal(result.status, 0, result.all);
  assert.equal(result.json.bites, true);
  assert.equal(result.json.test.exitCode, 1);
  assert.equal(result.json.restored, true);
  assert.equal(sha(join(dir, PROTECTED)), before, "the file has to come back byte for byte");
  assert.deepEqual(storeEntries(dir), [], "backups are deleted once the hashes verify");
});

test("a mutation the test sails through is reported as measuring nothing", (t) => {
  const dir = project(t);
  const before = sha(join(dir, PROTECTED));
  // A change the check cannot see: the retry branch is still there.
  const mutated = write(join(dir, "mutated.mjs"), `// a comment\n${WITH_RETRY}`);

  const result = proveIt(dir, ["--file", PROTECTED, "--with", mutated, "--test", "node check.mjs"]);

  assert.equal(result.status, 0, result.all);
  assert.equal(result.json.bites, false);
  assert.equal(result.json.test.exitCode, 0);
  assert.equal(sha(join(dir, PROTECTED)), before);
  assert.deepEqual(storeEntries(dir), []);
});

test("--revert-to takes the file back to a committed revision", (t) => {
  const dir = project(t);
  const before = sha(join(dir, PROTECTED));

  const result = proveIt(dir, ["--file", PROTECTED, "--revert-to", "HEAD", "--test", "node check.mjs"]);

  assert.equal(result.status, 0, result.all);
  assert.match(result.json.mutation, /HEAD/);
  assert.equal(sha(join(dir, PROTECTED)), before);
});

test("the file's own uncommitted state is what gets restored, not the committed one", (t) => {
  const dir = project(t);
  // The reason `git status --porcelain` could never verify this: before and after, the
  // file is " M src/thing.mjs" either way.
  const uncommitted = `${WITH_RETRY}// work in progress, not committed\n`;
  writeFileSync(join(dir, PROTECTED), uncommitted);
  const mutated = write(join(dir, "mutated.mjs"), WITHOUT_RETRY);

  const result = proveIt(dir, ["--file", PROTECTED, "--with", mutated, "--test", "node check.mjs"]);

  assert.equal(result.status, 0, result.all);
  assert.equal(readFileSync(join(dir, PROTECTED), "utf8"), uncommitted);
});

test("the file's mode survives the round trip", (t) => {
  const dir = project(t);
  chmodSync(join(dir, PROTECTED), 0o755);
  const mutated = write(join(dir, "mutated.mjs"), WITHOUT_RETRY);

  proveIt(dir, ["--file", PROTECTED, "--with", mutated, "--test", "node check.mjs"]);

  assert.equal(statSync(join(dir, PROTECTED)).mode & 0o777, 0o755);
});

test("a run killed mid-mutation leaves a manifest, and --recover puts the file back", (t) => {
  const dir = project(t);
  const before = sha(join(dir, PROTECTED));
  const mutated = write(join(dir, "mutated.mjs"), WITHOUT_RETRY);

  // The test command kills the runner outright: no handler runs, nothing is restored.
  const killed = proveIt(dir, ["--file", PROTECTED, "--with", mutated, "--test", "kill -9 $PPID"]);
  assert.notEqual(killed.status, 0, "the runner is supposed to die here");
  assert.notEqual(sha(join(dir, PROTECTED)), before, "the mutation is still in place");
  assert.equal(storeEntries(dir).length, 1, "the interrupted run left its manifest behind");

  const recovered = proveIt(dir, ["--recover"]);
  assert.equal(recovered.status, 0, recovered.all);
  assert.equal(sha(join(dir, PROTECTED)), before);
  assert.deepEqual(storeEntries(dir), []);
});

test("a new run refuses to start on top of an interrupted one", (t) => {
  const dir = project(t);
  const mutated = write(join(dir, "mutated.mjs"), WITHOUT_RETRY);
  proveIt(dir, ["--file", PROTECTED, "--with", mutated, "--test", "kill -9 $PPID"]);

  const second = proveIt(dir, ["--file", PROTECTED, "--with", mutated, "--test", "node check.mjs"]);
  assert.notEqual(second.status, 0);
  assert.match(second.all, /--recover/);
});

test("recovery refuses a backup whose hash does not match, rather than restoring rubbish", (t) => {
  const dir = project(t);
  const mutated = write(join(dir, "mutated.mjs"), WITHOUT_RETRY);
  proveIt(dir, ["--file", PROTECTED, "--with", mutated, "--test", "kill -9 $PPID"]);

  const [runDir] = storeEntries(dir);
  const backup = join(dir, ".prove-it", runDir, "backup", PROTECTED);
  writeFileSync(backup, "something else entirely\n");

  const recovered = proveIt(dir, ["--recover"]);
  assert.notEqual(recovered.status, 0);
  assert.match(recovered.all, /hash/i);
  assert.notEqual(
    readFileSync(join(dir, PROTECTED), "utf8"),
    "something else entirely\n",
    "a backup that fails its hash is never written over the working file",
  );
  assert.equal(storeEntries(dir).length, 1, "nothing is deleted when verification fails");
});

test("--recover with nothing to recover says so and succeeds", (t) => {
  const dir = project(t);
  const result = proveIt(dir, ["--recover"]);
  assert.equal(result.status, 0, result.all);
  assert.match(result.stdout, /nothing to recover/i);
});

test("--status names what an interrupted run left behind", (t) => {
  const dir = project(t);
  const mutated = write(join(dir, "mutated.mjs"), WITHOUT_RETRY);
  proveIt(dir, ["--file", PROTECTED, "--with", mutated, "--test", "kill -9 $PPID"]);

  const result = proveIt(dir, ["--status"]);
  assert.equal(result.status, 0, result.all);
  assert.match(result.stdout, new RegExp(PROTECTED.replace("/", "\\/")));
});

test("it refuses a file that is not there instead of snapshotting nothing", (t) => {
  const dir = project(t);
  const result = proveIt(dir, ["--file", "src/imaginary.mjs", "--revert-to", "HEAD", "--test", "true"]);
  assert.notEqual(result.status, 0);
  assert.match(result.all, /imaginary/);
  assert.deepEqual(storeEntries(dir), []);
});

test("it refuses a run with no mutation and a run with no test command", (t) => {
  const dir = project(t);
  assert.notEqual(proveIt(dir, ["--file", PROTECTED, "--test", "true"]).status, 0);
  assert.notEqual(proveIt(dir, ["--file", PROTECTED, "--revert-to", "HEAD"]).status, 0);
  assert.deepEqual(storeEntries(dir), []);
});

test("it never reaches for the shared stash", () => {
  const source = readFileSync(join(REPO, "scripts/prove-it.mjs"), "utf8");
  const code = source.replace(/^\s*\*.*$/gm, "").replace(/\/\/.*$/gm, "");
  assert.doesNotMatch(code, /\bstash\b/, "the stash is shared with every other session");
});
