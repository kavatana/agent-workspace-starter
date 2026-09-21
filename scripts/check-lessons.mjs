#!/usr/bin/env node
/**
 * Reads every lesson's frontmatter and refuses the ones that are only notes.
 *
 * Exists because the rule "every mistake becomes a check" is itself a rule someone has
 * to remember, and rules you have to remember lapse. This one does not.
 */
import { readdirSync, readFileSync, existsSync } from "node:fs";
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

for (const file of files) {
  const text = readFileSync(join(DIR, file), "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---/);
  if (!match) {
    errors.push(`${file}: no frontmatter`);
    continue;
  }
  const fields = Object.fromEntries(
    match[1]
      .split("\n")
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

  const times = Number(fields.occurrences);
  const enforced = fields.enforced_by && fields.enforced_by !== "none";
  if (Number.isFinite(times) && times > 1 && !enforced) {
    // Not an error: you cannot always automate a rule. But it has now cost you twice,
    // and it will cost you a third time.
    warnings.push(`${file}: happened ${times} times and still has no check`);
  } else if (!enforced) {
    warnings.push(`${file}: no check yet — it is a note, not a rule`);
  }
  if (enforced && !existsSync(fields.enforced_by.split(",")[0].trim())) {
    errors.push(`${file}: enforced_by names "${fields.enforced_by}", which does not exist`);
  }
}

for (const warning of warnings) console.log(`  warning  ${warning}`);
for (const error of errors) console.error(`  error    ${error}`);

const enforcedCount = files.length - warnings.length;
console.log(
  `\n${files.length} lesson(s), ${enforcedCount} with a check, ${warnings.length} still only a note.`,
);
if (errors.length) {
  console.error(`${errors.length} error(s).`);
  process.exit(1);
}
