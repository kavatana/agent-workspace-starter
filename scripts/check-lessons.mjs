#!/usr/bin/env node
/**
 * Reads every lesson's frontmatter and refuses the ones that are only notes.
 *
 * Exists because the rule "every mistake becomes a check" is itself a rule someone has
 * to remember, and rules you have to remember lapse. This one does not.
 *
 * The validator is held to the standard it applies: a lesson that claims a check is
 * counted as enforced only once that check has been found on disk and found to be a
 * file. `test/check-lessons.test.mjs` is this script's own check.
 *
 * Paths in `enforced_by` are resolved from the directory you run this in, which is the
 * repository root.
 */
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const DIR = process.argv[2] ?? "lessons";
const REQUIRED = ["id", "enforced_by", "occurrences", "first_seen"];

if (!existsSync(DIR)) {
  console.log(`No ${DIR}/ directory. Nothing to check.`);
  process.exit(0);
}

const files = readdirSync(DIR).filter((f) => f.endsWith(".md") && f !== "README.md");
const errors = [];
const warnings = [];
let withARealCheck = 0;

for (const file of files) {
  const text = readFileSync(join(DIR, file), "utf8");
  // \r?\n, because a lesson written on Windows opens `---\r\n` and a validator that
  // calls that "no frontmatter" sends its author hunting for a mistake they did not make.
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) {
    errors.push(`${file}: no frontmatter`);
    continue;
  }
  const fields = Object.fromEntries(
    match[1]
      .split(/\r?\n/)
      .map((line) => line.split(/:(.*)/s))
      .filter((pair) => pair.length > 1)
      .map(([key, value]) => [key.trim(), value.trim()]),
  );

  for (const key of REQUIRED) {
    if (!fields[key]) errors.push(`${file}: missing ${key}`);
  }
  if (fields.id && fields.id !== file.replace(/\.md$/, "")) {
    errors.push(`${file}: id "${fields.id}" does not match the filename`);
  }
  if (fields.first_seen && !/^\d{4}-\d{2}-\d{2}$/.test(fields.first_seen)) {
    errors.push(`${file}: first_seen "${fields.first_seen}" is not YYYY-MM-DD`);
  }

  // A count of the times it has happened: whole, and at least the once that produced
  // the file. Number() alone reads "banana" as NaN and "-2" as a perfectly good
  // number, and both used to travel to the summary line unremarked.
  let times = null;
  if (fields.occurrences !== undefined) {
    if (/^\d+$/.test(fields.occurrences) && Number(fields.occurrences) >= 1) {
      times = Number(fields.occurrences);
    } else {
      errors.push(
        `${file}: occurrences "${fields.occurrences}" is not a whole number of times, one or more`,
      );
    }
  }

  // enforced_by is either the single word "none" or a comma-separated list of checks.
  // Every entry is looked at: a list whose first check exists and whose second was
  // deleted last month is a lesson nothing enforces any more.
  const declared =
    !fields.enforced_by || fields.enforced_by === "none"
      ? []
      : fields.enforced_by.split(",").map((p) => p.trim()).filter(Boolean);

  let everyCheckIsReal = declared.length > 0;
  for (const path of declared) {
    if (path === "none") {
      errors.push(`${file}: enforced_by lists "none" beside a path; it is enforced or it is not`);
      everyCheckIsReal = false;
    } else if (!existsSync(path)) {
      errors.push(`${file}: enforced_by names "${path}", which does not exist`);
      everyCheckIsReal = false;
    } else if (!statSync(path).isFile()) {
      // A directory exists, so existsSync is satisfied, and nothing in it ever runs.
      errors.push(`${file}: enforced_by names "${path}", which is a directory, not a check`);
      everyCheckIsReal = false;
    }
  }

  if (declared.length === 0) {
    warnings.push(
      times !== null && times > 1
        ? // Not an error: you cannot always automate a rule. But it has now cost you
          // twice, and it will cost you a third time.
          `${file}: happened ${times} times and still has no check`
        : `${file}: no check yet — it is a note, not a rule`,
    );
  }
  if (everyCheckIsReal) withARealCheck += 1;
}

for (const warning of warnings) console.log(`  warning  ${warning}`);
for (const error of errors) console.error(`  error    ${error}`);

// Three buckets that add up: enforced, honest notes, and lessons naming a check that is
// not there. The last used to be counted as enforced, so the summary line contradicted
// the error printed four lines above it.
const brokenClaims = files.length - withARealCheck - warnings.length;
const counted = `${files.length} lesson(s), ${withARealCheck} with a check, ${warnings.length} still only a note`;
console.log(
  `\n${counted}${brokenClaims > 0 ? `, ${brokenClaims} naming a check that is not there.` : "."}`,
);

if (errors.length) {
  console.error(`${errors.length} error(s).`);
  process.exit(1);
}
