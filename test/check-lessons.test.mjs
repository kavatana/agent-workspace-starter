/**
 * The lesson validator's whole job is to refuse a lesson that claims a check it has
 * not got. Each case below is a lesson it used to wave through, or a true lesson it
 * used to reject.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { REPO, runScript, tempDir, write } from "../scripts/lib/fixtures.mjs";

const lesson = (fields, body = "# A rule\n\nIt happened.\n") =>
  `---\n${Object.entries(fields)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n")}\n---\n\n${body}`;

/** A workspace with a lessons/ directory and a real script to point `enforced_by` at. */
function workspace(t, files) {
  const dir = tempDir(t);
  write(join(dir, "scripts", "a-real-check.mjs"), "process.exit(0);\n");
  for (const [name, contents] of Object.entries(files)) write(join(dir, "lessons", name), contents);
  return dir;
}

const check = (dir, args = ["lessons"]) => runScript("scripts/check-lessons.mjs", args, { cwd: dir });

test("occurrences that is not a number is refused", (t) => {
  const dir = workspace(t, {
    "banana.md": lesson({
      id: "banana",
      enforced_by: "scripts/a-real-check.mjs",
      occurrences: "banana",
      first_seen: "2026-09-21",
    }),
  });
  const result = check(dir);
  assert.match(result.all, /occurrences/, "it must say which field is wrong");
  assert.equal(result.status, 1, "a lesson with occurrences: banana must fail the check");
});

test("occurrences that is negative or zero is refused", (t) => {
  for (const value of ["-2", "0", "1.5"]) {
    const dir = workspace(t, {
      "counted.md": lesson({
        id: "counted",
        enforced_by: "scripts/a-real-check.mjs",
        occurrences: value,
        first_seen: "2026-09-21",
      }),
    });
    const result = check(dir);
    assert.equal(result.status, 1, `occurrences: ${value} must fail the check`);
  }
});

test("every path in enforced_by is checked, not only the first", (t) => {
  const dir = workspace(t, {
    "two-checks.md": lesson({
      id: "two-checks",
      enforced_by: "scripts/a-real-check.mjs, scripts/this-one-is-gone.mjs",
      occurrences: "1",
      first_seen: "2026-09-21",
    }),
  });
  const result = check(dir);
  assert.match(result.all, /this-one-is-gone\.mjs/, "the missing second check must be named");
  assert.equal(result.status, 1);
});

test("a directory is not a check", (t) => {
  const dir = workspace(t, {
    "points-at-a-folder.md": lesson({
      id: "points-at-a-folder",
      enforced_by: "scripts",
      occurrences: "1",
      first_seen: "2026-09-21",
    }),
  });
  mkdirSync(join(dir, "scripts"), { recursive: true });
  const result = check(dir);
  assert.match(result.all, /director/i, "it must say the path is a directory");
  assert.equal(result.status, 1);
});

test("frontmatter written with CRLF line endings is read, not rejected", (t) => {
  const dir = workspace(t, {
    "from-windows.md": lesson({
      id: "from-windows",
      enforced_by: "scripts/a-real-check.mjs",
      occurrences: "1",
      first_seen: "2026-09-21",
    }).replace(/\n/g, "\r\n"),
  });
  const result = check(dir);
  assert.doesNotMatch(result.all, /no frontmatter/, "CRLF frontmatter is still frontmatter");
  assert.equal(result.status, 0, result.all);
  assert.match(result.stdout, /1 with a check/);
});

test("a lesson naming a check that is not there is never counted as having one", (t) => {
  const dir = workspace(t, {
    "claims-a-check.md": lesson({
      id: "claims-a-check",
      enforced_by: "scripts/nothing-here.mjs",
      occurrences: "1",
      first_seen: "2026-09-21",
    }),
  });
  const result = check(dir);
  assert.equal(result.status, 1);
  assert.doesNotMatch(
    result.stdout,
    /1 lesson\(s\), 1 with a check/,
    "the summary must not claim a check the error above says is missing",
  );
  assert.match(result.stdout, /1 lesson\(s\), 0 with a check/);
});

test("a lesson with a real check passes and is counted", (t) => {
  const dir = workspace(t, {
    "good.md": lesson({
      id: "good",
      enforced_by: "scripts/a-real-check.mjs",
      occurrences: "3",
      first_seen: "2026-09-21",
    }),
  });
  const result = check(dir);
  assert.equal(result.status, 0, result.all);
  assert.match(result.stdout, /1 lesson\(s\), 1 with a check/);
});

test("a lesson with no check is a warning, not an error", (t) => {
  const dir = workspace(t, {
    "only-a-note.md": lesson({
      id: "only-a-note",
      enforced_by: "none",
      occurrences: "1",
      first_seen: "2026-09-21",
    }),
  });
  const result = check(dir);
  assert.equal(result.status, 0, result.all);
  assert.match(result.stdout, /it is a note, not a rule/);
  assert.match(result.stdout, /1 lesson\(s\), 0 with a check, 1 still only a note/);
});

test("a lesson whose id does not match its filename is refused", (t) => {
  const dir = workspace(t, {
    "named-one-thing.md": lesson({
      id: "named-another",
      enforced_by: "scripts/a-real-check.mjs",
      occurrences: "1",
      first_seen: "2026-09-21",
    }),
  });
  assert.equal(check(dir).status, 1);
});

test("an empty lessons directory passes", (t) => {
  const dir = workspace(t, {});
  mkdirSync(join(dir, "lessons"), { recursive: true });
  const result = check(dir);
  assert.equal(result.status, 0, result.all);
  assert.match(result.stdout, /0 lesson\(s\)/);
});

test("this repository's own lessons pass", () => {
  const result = runScript("scripts/check-lessons.mjs", ["lessons"], { cwd: REPO });
  assert.equal(result.status, 0, result.all);
});
