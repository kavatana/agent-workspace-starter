#!/usr/bin/env node
/**
 * The file-juggling half of `/prove-it`: take one thing away, run the test that is
 * supposed to notice, and put the thing back — provably.
 *
 * The skill used to do this itself, in prose, and check its work with
 * `git status --porcelain`. That output is byte-for-byte identical for a file that was
 * already modified and has since been modified differently, so it could not tell a
 * restored file from a file left mutated. And nothing at all recovered a run that
 * ended in the middle: a crash, a limit or a closed tab left somebody's code broken
 * with no record of what it used to be.
 *
 * So: snapshot by content hash into a backup, write a manifest, apply one mutation,
 * run the named test command, restore, verify every hash, and only then delete the
 * backups. If the run dies before that, the manifest is still on disk and `--recover`
 * finishes the job.
 *
 * The skill decides what to mutate and reads the result. This script decides nothing.
 *
 *   node scripts/prove-it.mjs --file src/pay.ts --revert-to <rev> --test "npm test pay"
 *   node scripts/prove-it.mjs --file src/pay.ts --with /tmp/pay-without-retry.ts \
 *                             --test "npm test pay" --label "the retry branch"
 *   node scripts/prove-it.mjs --recover
 *   node scripts/prove-it.mjs --status
 *
 * Exit 0 when the run finished and every file was restored — whether or not the test
 * bit. Non-zero when it could not run, or could not put something back; read the JSON
 * on stdout for `bites`.
 *
 * `test/prove-it.test.mjs` is its check.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  chmodSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, relative, resolve } from "node:path";

const STORE = ".prove-it";
const MANIFEST = "manifest.json";

const die = (message) => {
  console.error(`prove-it: ${message}`);
  process.exit(1);
};

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

// ------------------------------------------------------------------- arguments

function parseArgs(argv) {
  const options = { files: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = () => {
      const next = argv[i + 1];
      if (next === undefined || next.startsWith("--")) die(`${arg} needs a value`);
      i += 1;
      return next;
    };
    if (arg === "--file") options.files.push(value());
    else if (arg === "--revert-to") options.revertTo = value();
    else if (arg === "--with") options.with = value();
    else if (arg === "--test") options.test = value();
    else if (arg === "--label") options.label = value();
    else if (arg === "--recover") options.recover = true;
    else if (arg === "--status") options.status = true;
    else if (arg === "--help" || arg === "-h") options.help = true;
    else die(`unknown option ${arg}`);
  }
  return options;
}

const options = parseArgs(process.argv.slice(2));

if (options.help) {
  console.log(readFileSync(new URL(import.meta.url)).toString().split("*/")[0].replace(/^#![^\n]*\n/, ""));
  process.exit(0);
}

// ------------------------------------------------------------- where we are

const root = (() => {
  try {
    return execFileSync("git", ["rev-parse", "--show-toplevel"], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    // No git, or not a repository. The snapshot machinery does not need git unless
    // --revert-to is used, so carry on from here.
    return process.cwd();
  }
})();

const storeDir = join(root, STORE);

/** Every manifest an earlier run left behind, newest last. */
function pendingRuns() {
  if (!existsSync(storeDir)) return [];
  return readdirSync(storeDir)
    .map((name) => ({ name, path: join(storeDir, name, MANIFEST) }))
    .filter((run) => existsSync(run.path))
    .map((run) => ({ ...run, manifest: JSON.parse(readFileSync(run.path, "utf8")) }))
    .sort((a, b) => a.manifest.startedAt.localeCompare(b.manifest.startedAt));
}

/**
 * Put every file in a manifest back, and prove it went back: the backup's bytes must
 * hash to what was recorded before the copy, and the restored file must hash to the
 * same thing after it. A backup that fails is never written over anyone's work.
 */
function restore(manifest) {
  const failures = [];
  for (const entry of manifest.files) {
    const backup = join(root, entry.backup);
    const target = join(root, entry.path);
    if (!existsSync(backup)) {
      failures.push(`${entry.path}: its backup ${entry.backup} is gone`);
      continue;
    }
    const bytes = readFileSync(backup);
    if (sha256(bytes) !== entry.sha256) {
      failures.push(`${entry.path}: the backup's hash does not match the manifest; it was not restored`);
      continue;
    }
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, bytes);
    chmodSync(target, entry.mode);
    if (sha256(readFileSync(target)) !== entry.sha256) {
      failures.push(`${entry.path}: the restored file's hash does not match the manifest`);
    }
  }
  return failures;
}

function finish(run) {
  const failures = restore(run.manifest);
  if (failures.length === 0) rmSync(join(storeDir, run.name), { recursive: true, force: true });
  if (existsSync(storeDir) && readdirSync(storeDir).length === 0) rmSync(storeDir, { recursive: true, force: true });
  return failures;
}

// ------------------------------------------------------------------ --status

if (options.status) {
  const runs = pendingRuns();
  if (runs.length === 0) console.log("prove-it: nothing in progress. The working tree is nobody's business but yours.");
  for (const run of runs) {
    const { manifest } = run;
    console.log(
      `prove-it: ${run.name} — ${manifest.state}, started ${manifest.startedAt}${
        manifest.label ? ` (${manifest.label})` : ""
      }`,
    );
    for (const entry of manifest.files) console.log(`  ${entry.path} ← ${entry.backup}`);
    console.log(`  run \`node scripts/prove-it.mjs --recover\` to put these back`);
  }
  process.exit(0);
}

// ----------------------------------------------------------------- --recover

if (options.recover) {
  const runs = pendingRuns();
  if (runs.length === 0) {
    console.log("prove-it: nothing to recover.");
    process.exit(0);
  }
  let failed = false;
  for (const run of runs) {
    const failures = finish(run);
    if (failures.length) {
      failed = true;
      console.error(`prove-it: could not recover ${run.name}:`);
      for (const failure of failures) console.error(`  ${failure}`);
      console.error(`  nothing in ${join(STORE, run.name)} was deleted. Look at it before you touch the files.`);
    } else {
      console.log(`prove-it: recovered ${run.manifest.files.length} file(s) from ${run.name}.`);
    }
  }
  process.exit(failed ? 1 : 0);
}

// --------------------------------------------------------------------- a run

if (options.files.length === 0) die("give it at least one --file");
if (!options.test) die("give it the test command to run, with --test");
if (!options.revertTo && !options.with) die("give it a mutation: --revert-to <rev> or --with <file>");
if (options.revertTo && options.with) die("--revert-to and --with are two mutations; run them one at a time");
if (options.with && options.files.length > 1) die("--with replaces one file; give one --file");

const pending = pendingRuns();
if (pending.length) {
  die(
    `an earlier run was interrupted and its files are still mutated (${pending
      .map((r) => r.name)
      .join(", ")}). Run \`node scripts/prove-it.mjs --recover\` first.`,
  );
}

const runName = `${new Date().toISOString().replace(/[:.]/g, "-")}-${process.pid}`;
const runDir = join(storeDir, runName);
const manifestPath = join(runDir, MANIFEST);

const manifest = {
  version: 1,
  startedAt: new Date().toISOString(),
  label: options.label ?? null,
  root,
  testCommand: options.test,
  mutation: options.revertTo ? `reverted to ${options.revertTo}` : `replaced with ${options.with}`,
  state: "snapshot",
  files: [],
};
const saveManifest = () => writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

// Read everything and check it before a single byte is written anywhere.
const targets = options.files.map((file) => {
  const target = join(root, file);
  if (!existsSync(target) || !statSync(target).isFile()) die(`--file ${file}: not a file in ${root}`);
  return { file, target, bytes: readFileSync(target), mode: statSync(target).mode & 0o777 };
});

const replacements = new Map();
if (options.with) {
  const source = resolve(process.cwd(), options.with);
  if (!existsSync(source)) die(`--with ${options.with}: not found`);
  replacements.set(targets[0].file, readFileSync(source));
} else {
  for (const { file } of targets) {
    try {
      replacements.set(
        file,
        execFileSync("git", ["show", `${options.revertTo}:${file}`], {
          cwd: root,
          maxBuffer: 64 * 1024 * 1024,
          stdio: ["ignore", "pipe", "pipe"],
        }),
      );
    } catch (error) {
      die(`--revert-to ${options.revertTo}: git could not read ${file} at that revision — ${
        (error.stderr ?? "").toString().trim() || error.message
      }`);
    }
  }
}

mkdirSync(join(runDir, "backup"), { recursive: true });
for (const { file, bytes, mode } of targets) {
  const backup = join(runDir, "backup", file);
  mkdirSync(dirname(backup), { recursive: true });
  writeFileSync(backup, bytes);
  manifest.files.push({
    path: file,
    sha256: sha256(bytes),
    bytes: bytes.length,
    mode,
    backup: relative(root, backup),
  });
}
saveManifest();

const run = { name: runName, manifest };
let restoreFailures = null;
const putBack = () => {
  if (restoreFailures !== null) return restoreFailures;
  restoreFailures = finish(run);
  return restoreFailures;
};

// A catchable signal still restores. SIGKILL does not, which is what --recover is for.
for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
  process.on(signal, () => {
    putBack();
    process.exit(130);
  });
}

let testResult;
try {
  manifest.state = "mutated";
  saveManifest();
  for (const { file, target, mode } of targets) {
    writeFileSync(target, replacements.get(file));
    chmodSync(target, mode);
  }

  const outcome = spawnSync(options.test, {
    cwd: root,
    shell: true,
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  });
  const output = `${outcome.stdout ?? ""}${outcome.stderr ?? ""}`;
  testResult = {
    command: options.test,
    exitCode: outcome.status,
    signal: outcome.signal ?? null,
    // Enough of the tail to tell red-for-the-right-reason from red-for-a-syntax-error.
    tail: output.split("\n").slice(-25).join("\n").trim(),
  };
} finally {
  restoreFailures = putBack();
}

if (restoreFailures.length) {
  console.error("prove-it: THE FILES ARE STILL MUTATED. Nothing was deleted.");
  for (const failure of restoreFailures) console.error(`  ${failure}`);
  console.error(`  the manifest is at ${join(STORE, runName, MANIFEST)}`);
  process.exit(1);
}

const bites = testResult.exitCode !== 0;
console.log(
  `prove-it: ${bites ? "BITES" : "MEASURES NOTHING"} — ${manifest.files
    .map((f) => f.path)
    .join(", ")} ${manifest.mutation}, \`${options.test}\` exited ${testResult.exitCode}${
    testResult.signal ? ` (${testResult.signal})` : ""
  }. Everything restored and verified.`,
);
console.log(
  JSON.stringify(
    {
      label: options.label ?? null,
      files: manifest.files.map((f) => f.path),
      mutation: manifest.mutation,
      test: testResult,
      bites,
      restored: true,
    },
    null,
    2,
  ),
);
