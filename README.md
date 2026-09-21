# Agent workspace starter

Small files that make a repository readable by a coding agent, and make the agent's work
checkable by a person: a contract every session is bound by, a reviewer that cannot
write, a mutation check that proves each test can fail, and the scripts that hold those
up.

The markdown, the lessons and the scripts are plain files and plain Node, and work with
any agent or with none. The `.claude/` directory is Claude Code's own format for agents,
skills and hooks — the ideas port to other tools, the syntax does not.

It is opinionated because vague rules do nothing. Change the opinions; keep the shape.

## The whole system

```mermaid
flowchart LR
  subgraph CONTRACT["THE REPO BINDS EVERY AGENT"]
    A1["<b>AGENTS.md</b><br/>what must pass<br/>what must never happen"]
    A2["<b>DEFINITION-OF-DONE.md</b><br/>proved by output,<br/>never by a sentence"]
    A3["<b>lessons/</b><br/>every mistake is filed here,<br/>with the check that stops it"]
  end

  subgraph WRITE["WRITE · max 3 agents · one worktree each"]
    BRIEF["<b>Brief, in a file</b><br/>task · rules ·<br/>how it gets verified"]
    B1["<b>Builder agent</b><br/>worktree A"]
    B2["<b>Builder agent</b><br/>worktree B"]
    B3["<b>Builder agent</b><br/>worktree C"]
    HOOK(["<b>Session-start hook</b><br/>abandoned worktrees ·<br/>orphaned ports"])
  end

  subgraph GATE["GATE · automatic"]
    T["<b>tests · lint · build</b><br/>then <b>/prove-it</b>:<br/>take away what each new test<br/>protects → it must go RED"]
  end

  subgraph REVIEW["REVIEW · read-only"]
    R["<b>Reviewer agent</b><br/>NO edit · push · merge tools<br/>sees diff + brief, never the chat"]
    F{"Critical or<br/>Important?"}
  end

  subgraph SHIP["SHIP · a person decides"]
    H["<b>A person merges</b><br/>checks the fact,<br/>not the exit code"]
    M["<b>Measure on the live URL</b><br/>several runs · a range"]
  end

  subgraph LEARN["LEARN · so it never costs twice"]
    L["<b>Lesson</b><br/>what happened · why it seemed right<br/>enforced_by: script | none"]
    C["<b>New check</b>"]
  end


  BRIEF --> B1 & B2 & B3
  B1 & B2 & B3 --> T
  T --> R
  R --> F
  F -- "no" --> H
  F -- "yes · findings with file:line" --> B1
  H --> M
  M -- "surprise or regression" --> L
  L --> C
  C -. joins the gate .-> T

  classDef file fill:#EEF1F5,stroke:#B9C2CE,color:#0F1720
  classDef agent fill:#E8EEFC,stroke:#1D4ED8,color:#0F1720,stroke-width:2px
  classDef check fill:#E6F4EC,stroke:#15803D,color:#0F1720,stroke-width:2px
  classDef human fill:#0F1720,stroke:#0F1720,color:#FFFFFF
  classDef learn fill:#FDF0E3,stroke:#B54708,color:#0F1720,stroke-width:2px
  classDef ask fill:#FFFFFF,stroke:#B42318,color:#0F1720,stroke-width:2px
  class A1,A2,A3,BRIEF,HOOK file
  class B1,B2,B3,R agent
  class T,C check
  class H,M human
  class L learn
  class F ask
```

The same diagram as a poster, with what it caught in its first week: [docs/loop.png](docs/loop.png)

| File | What it does |
| --- | --- |
| `AGENTS.md` | The contract the agent reads before it touches anything |
| `docs/DEFINITION-OF-DONE.md` | What "done" means, verified by command output, never by a sentence |
| `.claude/agents/reviewer.md` | An agent that only reviews: no edit tool, no shell, no way to push or merge |
| `.claude/agents/reviewer-deep.md` + `.claude/hooks/guard-reviewer-shell.mjs` | The same review when it has to run something. It gets a shell; every command goes through a guard that refuses writes outside a scratch directory, `git push/commit/merge/reset/stash`, `gh pr merge/comment/edit`, `rm`, and anything it cannot parse |
| `.claude/skills/prove-it/SKILL.md` + `scripts/prove-it.mjs` | `/prove-it` proves each new test can fail. The skill decides what to take away; the script snapshots the files by SHA-256, applies one mutation, runs the test you name, restores, verifies every hash, and deletes the backups only then. `--recover` finishes an interrupted run |
| `.claude/skills/workspace-audit/SKILL.md` | A skill (`/workspace-audit`) that measures what every session pays before work starts, finds rules nothing enforces and gates that cannot fail, and ranks what to cut, convert or keep. Read-only |
| `lessons/` + `scripts/check-lessons.mjs` | Every mistake becomes a check, and a script that says when it has not |
| `.claude/hooks/session-start.mjs` | Tells a new session what the last one left unfinished — or that it could not tell, and why |
| `test/` + `.github/workflows/verify.yml` | Every script above has tests, and they run on Node 18, 20 and 22 on every push and pull request |

## If you already run agents well

You will know most of the shape. These are the parts that are not obvious, each one
learned by paying for it:

**An agent's fake and an agent's code agree by construction.** The dangerous case is
not a missing test, it is a passing one. When the same author writes the code that
calls an API and the stub it is tested against, they are consistent with each other and need not be
consistent with reality — and the suite is green while nothing works. So: one test per
external contract, pinned from the vendor's documentation by hand, fed to the code
*without* passing through your own fake.

**Verify the agent's tests by mutation, every time, not occasionally.** After a suite
goes green, introduce the defect a test exists to catch and watch it fail. It takes
thirty seconds. In one week of agent-written tests this caught several that passed
identically before and after the change they were written for. The bar is not "it fails
without your change" — a characterisation test, or one carried through a refactor,
passes on both sides by design. The bar is that it fails under a defect it is supposed
to catch.

**Give the reviewer no write tools at all — and no shell either.** Not "please do not
edit" in the prompt: no edit tool in its definition, and no `Bash`, because `Bash` is an
edit tool wearing a different hat. A reviewer that can fix things starts fixing instead
of finding, and you lose the only reading you had that was not already invested in the
work being right. When a review genuinely needs to run something, that is a second,
rarer agent with a guard on its shell — and the guard is a filter, not a sandbox.

**Review is not a second opinion, it is a different question.** Reading your own
agent's diff you check whether it did what you asked. An agent with no memory of the
request checks whether it is *right*. That is why the reviewer gets the diff and the
original task but not your conversation.

**Anything that depends on arrival time cannot be measured locally.** Page load,
layout shift, any metric a font or a third party can be late for: a local server pays
no DNS, no TLS, no bandwidth, so the number reads clean while the defect is untouched.
Claim it from a deployed URL, several runs, as a range — or do not claim it.

**A success signal is not the fact.** A script that waits for checks and merges exited
zero without merging, because one API call came back empty and "not open" was read as
"already merged". Verify the fact — the pull request says merged, the branch contains
the commit — not the exit code of the thing that was supposed to cause it.

**Parallel agents fail by abandonment, not collision.** Worktrees stop them treading on
each other. What they do not stop is a session ending and leaving uncommitted work in a
copy nobody opens again, or a dev server holding a port. `session-start.mjs` reports
both at the top of every new session, because that is the only moment anyone looks.

**Three at a time.** The limit is not the machine. Past three, review stops being real
and starts being a glance, which defeats the point of the whole arrangement.

## The idea

An agent is very good at making its own pieces agree with each other. Consistency is
not correctness. Everything here exists to put a check between the agent's work and
the world.

Three things do most of the work:

1. **The contract is in the repository, not in your head.** Every session starts bound
   by the same rules, including sessions you did not start.
2. **The reviewer cannot write.** Reading your own agent's diff, you check whether it
   did what you asked. A reviewer with no memory of the request checks whether it is
   *right*. Give it no write tools at all, and no shell — not as etiquette, as a
   capability. A shell is a write tool.
3. **A rule you have to remember is a rule that lapses.** When something goes wrong,
   write the lesson *and the check that enforces it*. A lesson with no check is a note,
   and notes do not stop anything.

## Adopting it

**Prerequisites:** Node 18 or newer, and git. There are no dependencies and no install
step; `package.json` exists only to name the commands. `.github/workflows/verify.yml`
runs the suite on Node 18, 20 and 22, so that version claim is checked on every push
rather than asserted.

1. **Copy the files** into your repository. Delete what does not apply.
2. **Fill in `AGENTS.md`**: the two or three commands that must pass, and the two or
   three things that must never happen in this repository.
3. **Fill in `docs/DEFINITION-OF-DONE.md`** with rows you can actually verify. If a row
   cannot be proved by a command's output or a screenshot, cut it or make it provable.
4. **Run the checks**: `node --test`, then `node scripts/check-lessons.mjs`. The second
   passes with an empty `lessons/`.
5. **Wire the session-start hook**, and **make sure your agent really reads
   `AGENTS.md`**. Both are below, and both are easy to get almost right.

### The hook configuration

In `.claude/settings.json` to share it with everyone who clones the repository, or
`.claude/settings.local.json` to keep it to yourself:

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "node \"${CLAUDE_PROJECT_DIR}/.claude/hooks/session-start.mjs\"",
            "timeout": 15
          }
        ]
      }
    ]
  },
  "env": {
    "AGENT_WORKSPACE_ROOTS": "~/code:~/work",
    "AGENT_WORKSPACE_PORTS": "3000,5173,8787"
  }
}
```

`SessionStart` takes an optional `matcher` — `startup`, `resume`, `clear`, `compact`,
`fork` — and fires on all of them when you leave it out. What the hook prints on stdout
becomes part of the session's context, which is the whole point: the first thing a
session reads is what the last one left behind.

`AGENT_WORKSPACE_ROOTS` is a colon-separated list of directories to scan for checkouts,
and defaults to the parent of this repository's root — found with
`git rev-parse --show-toplevel`, not by walking up from wherever the session happens to
have started. `AGENT_WORKSPACE_PORTS` is a comma-separated list of the ports your dev
servers use, and defaults to none. When git is missing, a root has been moved, or a
`git status` fails, the hook prints **not checked** and the reason: it never turns a
command that failed into "nothing found".

The deep reviewer's guard is wired differently. It lives in `reviewer-deep.md`'s own
frontmatter, so it is registered only while that agent is running and removed when it
finishes; nothing goes in `settings.json` for it. One catch worth knowing: Claude Code
runs a project agent's frontmatter hooks only once you have trusted the folder holding
the agent file. Until you do, the agent still runs and **the guard is skipped**.

Reference: [hooks](https://code.claude.com/docs/en/hooks),
[subagents](https://code.claude.com/docs/en/sub-agents).

### Making sure the agent really reads AGENTS.md

Claude Code reads `AGENTS.md` as your project instructions — but only when there is no
`CLAUDE.md`, `.claude/CLAUDE.md` or `CLAUDE.local.md` in your working directory or any
directory above it. Add any one of those three, even a personal `CLAUDE.local.md` you
never committed, and Claude reads them *instead*; your contract quietly stops binding
anything and nothing tells you.

The portable fix is one line. Put a `CLAUDE.md` next to `AGENTS.md`:

```markdown
@AGENTS.md

## Claude Code

Anything Claude-specific goes below the import.
```

`@path` imports are expanded into the context at launch, resolve relative to the file
that contains them, and nest up to four deep. Keeping the import costs nothing in
versions that read `AGENTS.md` on their own — it is never loaded twice. A `CLAUDE.md`
that *tells* Claude in words to go and read `AGENTS.md` is not the same thing: that is
a suggestion the agent may act on, and the import is not.

Other tools that follow the `AGENTS.md` convention read the file directly and ignore
the `CLAUDE.md`.

Reference: [memory](https://code.claude.com/docs/en/memory).

### A guard is not a sandbox

`guard-reviewer-shell.mjs` reads the command as a string and refuses what it recognises.
That is the whole of it. It does not confine the process: `node -e` writes files, an
interpreter its list does not name writes files, and any script already in the
repository can do whatever it likes. Anyone actually trying to get around it will.

It is there for the accident and the habit — the reviewer that starts fixing, the
`git commit` typed from muscle memory — which is nearly everything that happens in
practice. The capability boundary in this setup is the default `reviewer`, which has no
shell at all. Reach for `reviewer-deep` when a review cannot be done by reading, and do
not let it become the default because it is more convenient.

## What it costs, measured

Every agent round has two token numbers and they are not the same number. The one the
harness prints when a round ends is a summary. The one below is what the session
transcripts say was actually processed, measured by a script that reads each
transcript's `usage` fields and sums them by kind, taking **the largest value seen per
API response** — a streaming response reports its usage cumulatively, so the last value
is the total and adding them all together multiplies the answer.

One day, one person, seven agent sessions and the session that dispatched them:

| Session | API calls | Cache write | Cache read | Output | Context per call | Weighted |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| The session dispatching the agents | 3,300 | 29,972,285 | 1,648,314,595 | 5,692,371 | 508,582 | 230,793,712 |
| Reviewer, one agent resumed six-plus times | 667 | 17,555,148 | 241,682,855 | 783,143 | 388,665 | 50,029,560 |
| Builder, a round of review fixes | 386 | 1,044,846 | 127,570,811 | 332,454 | 333,203 | 15,726,180 |
| Builder, one feature, two rounds | 202 | 679,429 | 45,484,563 | 180,720 | 228,536 | 6,301,746 |
| Researcher, two rounds | 59 | 644,600 | 11,982,925 | 90,035 | 214,027 | 2,454,335 |
| Builder, one small feature | 75 | 301,674 | 11,957,680 | 103,832 | 163,460 | 2,092,169 |
| **Reviewer, fresh, first look (9 findings)** | **12** | **54,165** | **377,213** | **26,668** | **35,950** | **238,791** |
| **Reviewer, fresh, re-check (6 findings)** | **14** | **69,515** | **581,987** | **29,775** | **46,537** | **293,995** |

"Context per call" is the average input the model re-read on every call. "Weighted"
folds the four token columns into one comparable number using list-price ratios per
input token — cached read 0.1, cache write 1.25, output 5. On a subscription those
ratios are not money; read that column as relative weight, not as a bill.

Four things fall out of it:

- **The session dispatching the agents cost three times all of them together**: about
  231 million weighted against about 77 million for the seven agent sessions. Its
  context averaged 508,582 tokens and every one of its 3,300 calls paid to re-read it.
  One of its tool calls cost about 70,000 weighted tokens — so **three of its tool
  calls cost one whole fresh review.**
- **Cost is calls multiplied by context.** The resumed reviewer carried 388,665 tokens
  of context per call. The fresh one carried 35,950, read one 5,000-token package, and
  found more: nine defects on a first look, two of them Critical, and six on a re-check.
- **Per finding that is about 3.3 million weighted tokens against about 27,000** —
  50,029,560 over the resumed agent's fifteen Critical-and-Important findings against
  238,791 over the fresh agent's nine. Two measurements on two different changes are a
  direction, not a ratio. But it is the same reviewer definition, and two of the nine
  things the fresh one found were errors in my own numbers, including a claim that used
  to be in this README.
- It overturned what I believed when I started: that doing a small job inline is
  cheaper than starting a cold agent. That holds only while your own context is small.
  Past roughly 100,000 tokens of it, a fresh agent with a written brief is the cheap way
  to do anything that takes more than a few calls.

Fourteen of the resumed reviewer's fifteen findings came from a first look. The
fifteenth came from a re-check, in code the fix itself had added. So:

- A fresh agent for every review, reading one package file, instead of a resumed one.
- Depth by risk: money, auth and privacy get the strongest model; a typo does not.
- A fix skips its second look only when it touches only what the finding named and a
  check in CI proves it. A fix that adds code needing judgement keeps its second look.
- A script before an agent. The researcher session above spent 2.45 million weighted
  tokens across 59 calls on work a script does for nothing per call.
- Every real finding becomes a check. A defect the gate catches is one no reviewer is
  ever paid to find again. This is the saving that compounds.

`/workspace-audit` looks for all of these in your own setup — and checks whether your
tool definitions are deferred before telling you what your tool servers cost, because
the answer differs by everything.

Not everything needs this. A script you will run twice does not. A repository other
people depend on does.
