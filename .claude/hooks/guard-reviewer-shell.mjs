#!/usr/bin/env node
/**
 * A PreToolUse guard for the deep reviewer's shell.
 *
 * The default reviewer has no shell at all, which is the only boundary worth trusting.
 * `reviewer-deep` exists for the reviews that need to run something — the suite, a
 * repro, a query plan — and this is what keeps that shell from becoming a write tool.
 *
 * It refuses:
 *   · anything that writes to a path outside the scratch directory
 *   · `git push`, `git commit`, `git merge`, `git reset`, `git stash`
 *   · `gh pr merge`, `gh pr comment`, `gh pr edit`
 *   · `rm` and its neighbours
 *   · redirection to anywhere but the scratch directory
 *   · anything that hides what will run: a subshell, a heredoc, `bash -c`, `eval`,
 *     `xargs`, `sudo`, or a command it cannot parse
 *
 * Everything else gets no decision, so the normal permission system still applies. It
 * never answers "allow", because "allow" would bypass that system rather than add to it.
 *
 * THIS IS NOT A SANDBOX. It is a denylist over a string, and a denylist over a string
 * is beatable by anyone who is trying: `node -e` writes files, an interpreter this list
 * does not name writes files, and a script already in the repository can do anything.
 * It stops the accident and the absent-minded habit, which is most of what happens. The
 * capability boundary is the default reviewer, which has no Bash. See the README.
 *
 * Contract: Claude Code writes the hook's JSON to stdin and reads a decision object
 * from stdout, exit 0.
 *   https://code.claude.com/docs/en/hooks  (PreToolUse input, permissionDecision)
 *
 * Configure the scratch directory with AGENT_REVIEW_SCRATCH; otherwise the hook input's
 * own `scratchpad_dir` is used, and the system temporary directory if there is none.
 *
 * `test/guard-reviewer-shell.test.mjs` is its check.
 */
import { readFileSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import { basename, isAbsolute, join, relative, resolve } from "node:path";

const deny = (reason) => {
  process.stdout.write(
    `${JSON.stringify(
      {
        hookSpecificOutput: {
          hookEventName: "PreToolUse",
          permissionDecision: "deny",
          permissionDecisionReason: `The reviewer's shell is read-only: ${reason}`,
        },
      },
      null,
      2,
    )}\n`,
  );
  process.exit(0);
};

const noDecision = () => process.exit(0);

// Commands that delete, escalate, or hide what actually runs. No argument analysis can
// make these safe, so none is attempted.
const REFUSED_OUTRIGHT = new Map([
  ["rm", "rm deletes"],
  ["rmdir", "rmdir deletes"],
  ["shred", "shred deletes"],
  ["unlink", "unlink deletes"],
  ["sudo", "sudo escalates"],
  ["doas", "doas escalates"],
  ["su", "su escalates"],
  ["eval", "eval hides what runs"],
  ["exec", "exec hides what runs"],
  ["source", "source hides what runs"],
  [".", "sourcing a file hides what runs"],
  ["xargs", "xargs hides what runs"],
  ["env", "env hides what runs"],
  ["nohup", "nohup hides what runs"],
  ["setsid", "setsid hides what runs"],
  ["bash", "a shell invocation hides what runs"],
  ["sh", "a shell invocation hides what runs"],
  ["zsh", "a shell invocation hides what runs"],
  ["dash", "a shell invocation hides what runs"],
  ["ksh", "a shell invocation hides what runs"],
  ["fish", "a shell invocation hides what runs"],
]);

// `stash` is here for the same reason `prove-it` forbids it: the stash stack is shared
// with every other checkout and session, so a reviewer using it can bury a builder's work.
const GIT_REFUSED = new Set(["push", "commit", "merge", "reset", "stash"]);
const GH_PR_REFUSED = new Set(["merge", "comment", "edit"]);
// `git -C dir`, `git -c k=v` and friends take a value; skipping them is how
// `git -C /repo push` stops looking like a read.
const GIT_OPTIONS_WITH_VALUES = new Set(["-C", "-c", "--git-dir", "--work-tree", "--namespace"]);

const WRITES_EVERY_PATH = new Set(["mkdir", "touch", "truncate", "tee", "chmod", "chown", "chgrp", "patch", "mv"]);
const WRITES_ITS_LAST_PATH = new Set(["cp", "ln", "install", "rsync"]);
const EDITS_IN_PLACE = new Set(["sed", "perl", "ruby", "awk", "gawk"]);
const ALWAYS_WRITABLE = new Set(["/dev/null", "/dev/stdout", "/dev/stderr", "/dev/tty", "/dev/zero"]);

/**
 * Split a command into words and operators, respecting quotes. Throws on anything it
 * cannot read, because a guard that guesses at a string is worse than no guard.
 */
function tokenize(command) {
  const tokens = [];
  let word = "";
  let started = false; // an empty word from '' is still a word
  let i = 0;
  const flush = (isFileDescriptor = false) => {
    if (!started) return;
    if (!isFileDescriptor) tokens.push({ t: "w", v: word });
    word = "";
    started = false;
  };
  const SEPARATORS = "<>|&;()\n";

  while (i < command.length) {
    const c = command[i];
    if (c === "\\") {
      if (i + 1 >= command.length) throw new Error("it ends in a backslash");
      word += command[i + 1];
      started = true;
      i += 2;
    } else if (c === "'") {
      const end = command.indexOf("'", i + 1);
      if (end === -1) throw new Error("a single quote is never closed");
      word += command.slice(i + 1, end);
      started = true;
      i = end + 1;
    } else if (c === '"') {
      let j = i + 1;
      while (j < command.length && command[j] !== '"') {
        if (command[j] === "\\" && j + 1 < command.length) {
          word += command[j + 1];
          j += 2;
        } else {
          word += command[j];
          j += 1;
        }
      }
      if (j >= command.length) throw new Error("a double quote is never closed");
      started = true;
      i = j + 1;
    } else if (c === " " || c === "\t" || c === "\r") {
      flush();
      i += 1;
    } else if (SEPARATORS.includes(c)) {
      // `2>file` and `1>file`: the digit is a file descriptor, not an argument.
      flush(c === ">" && started && (word === "1" || word === "2"));
      let op = "";
      while (i < command.length && SEPARATORS.includes(command[i]) && command[i] !== "\n") {
        op += command[i];
        i += 1;
      }
      if (op === "") {
        op = "\n";
        i += 1;
      }
      tokens.push({ t: "o", v: op });
    } else {
      word += c;
      started = true;
      i += 1;
    }
  }
  flush();
  return tokens;
}

function main() {
  let input;
  try {
    input = JSON.parse(readFileSync(0, "utf8"));
  } catch {
    deny("the guard could not read this tool call, so it refused it");
  }

  if (input.tool_name !== "Bash") noDecision();
  const command = input.tool_input?.command;
  if (typeof command !== "string" || !command.trim()) {
    deny("the guard could not find a command in this tool call, so it refused it");
  }

  const home = homedir();
  const cwd = typeof input.cwd === "string" && input.cwd ? input.cwd : process.cwd();
  const scratch = resolve(process.env.AGENT_REVIEW_SCRATCH || input.scratchpad_dir || tmpdir());

  /** Is this path inside the scratch directory? Relative paths resolve from the cwd. */
  const inScratch = (target) => {
    if (ALWAYS_WRITABLE.has(target)) return true;
    const absolute = resolve(cwd, target.startsWith("~") ? join(home, target.slice(1)) : target);
    const rel = relative(scratch, absolute);
    return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel));
  };
  const refuseWrite = (target, what) =>
    inScratch(target) ? null : deny(`${what} would write to ${target}, which is outside ${scratch}`);

  // Substitutions and heredocs put text the guard never sees into the command line.
  if (/\$\(|`|<\(|>\(/.test(command)) {
    deny("a subshell or command substitution hides what would run");
  }
  if (command.includes("<<")) deny("a heredoc's body is not something this guard can read");

  let tokens;
  try {
    tokens = tokenize(command);
  } catch (error) {
    deny(`the guard could not parse this command — ${error.message}`);
  }

  // One command per segment: `a && b`, `a | b`, `a; b` and `(a)` are each looked at.
  const segments = [[]];
  for (const token of tokens) {
    if (token.t === "o" && !token.v.includes(">") && !token.v.includes("<")) {
      if (segments[segments.length - 1].length) segments.push([]);
      continue;
    }
    segments[segments.length - 1].push(token);
  }

  for (const segment of segments) {
    const words = [];
    for (let i = 0; i < segment.length; i += 1) {
      const token = segment[i];
      if (token.t === "w") {
        words.push(token.v);
        continue;
      }
      if (token.v.includes("<") && !token.v.includes(">")) continue; // reading a file
      const target = segment[i + 1]?.t === "w" ? segment[i + 1].v : null;
      i += 1;
      if (target === null) deny("a redirection with no destination is not something this guard can read");
      if (token.v.includes("&") && /^\d+$|^-$/.test(target)) continue; // `2>&1`: a duplicate, not a file
      refuseWrite(target, "a redirection");
    }

    // A leading `FOO=bar` is an environment assignment, not the command.
    let at = 0;
    while (at < words.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(words[at])) at += 1;
    if (at >= words.length) continue;

    const head = basename(words[at]);
    const args = words.slice(at + 1);
    const paths = args.filter((a) => !a.startsWith("-") && !a.startsWith("+"));

    if (REFUSED_OUTRIGHT.has(head)) deny(`${REFUSED_OUTRIGHT.get(head)} — \`${head}\` is refused outright`);

    if (head === "git") {
      let g = 0;
      while (g < args.length && args[g].startsWith("-")) {
        if (GIT_OPTIONS_WITH_VALUES.has(args[g])) g += 1;
        g += 1;
      }
      const subcommand = args[g];
      if (GIT_REFUSED.has(subcommand)) {
        deny(`\`git ${subcommand}\` changes history or the remote; the reviewer reports, a person acts`);
      }
    }

    if (head === "gh") {
      const [noun, verb] = args.filter((a) => !a.startsWith("-"));
      if (noun === "pr" && GH_PR_REFUSED.has(verb)) {
        deny(`\`gh pr ${verb}\` writes to the pull request; the reviewer reports, a person acts`);
      }
    }

    if (head === "find" && args.some((a) => ["-delete", "-exec", "-execdir", "-ok", "-okdir"].includes(a))) {
      deny("`find` with -delete or -exec runs something this guard cannot see");
    }

    if (head === "dd") {
      const out = args.find((a) => a.startsWith("of="));
      if (out) refuseWrite(out.slice(3), "`dd`");
    }

    if (WRITES_EVERY_PATH.has(head)) {
      for (const p of paths) refuseWrite(p, `\`${head}\``);
    }

    if (WRITES_ITS_LAST_PATH.has(head)) {
      const flagged = args.findIndex((a) => a === "-t" || a === "--target-directory");
      const destination = flagged === -1 ? paths[paths.length - 1] : args[flagged + 1];
      if (destination !== undefined) refuseWrite(destination, `\`${head}\``);
    }

    if (EDITS_IN_PLACE.has(head) && args.some((a) => a === "-i" || a.startsWith("-i"))) {
      for (const p of paths) refuseWrite(p, `\`${head} -i\``);
    }
  }

  noDecision();
}

main();
