# Agent workspace starter

Six files that make a repository readable by a coding agent, and make the agent's
work checkable by a person. Drop them into any repository; nothing here depends on a
language, a framework, or a particular agent.

It is opinionated because vague rules do nothing. Change the opinions; keep the shape.

| File | What it does |
| --- | --- |
| `AGENTS.md` | The contract the agent reads before it touches anything |
| `docs/DEFINITION-OF-DONE.md` | What "done" means, verified by command output, never by a sentence |
| `.claude/agents/reviewer.md` | An agent that only reviews, and cannot write, push or merge |
| `lessons/` + `scripts/check-lessons.mjs` | Every mistake becomes a check, and a script that says when it has not |
| `.claude/hooks/session-start.sh` | Tells a new session what the last one left unfinished |

## If you already run agents well

You will know most of the shape. These are the parts that are not obvious, each one
learned by paying for it:

**An agent's fake and an agent's code agree by construction.** The dangerous case is
not a missing test, it is a passing one. When the same author writes the client and
the stub it is tested against, they are consistent with each other and need not be
consistent with reality — and the suite is green while nothing works. So: one test per
external contract, pinned from the vendor's documentation by hand, fed to the code
*without* passing through your own fake.

**Verify the agent's tests by mutation, every time, not occasionally.** After a suite
goes green, break the thing the test claims to protect and watch it fail. It takes
thirty seconds. On a month of agent-written tests this caught several that passed
identically before and after the change they were written for.

**Give the reviewer no write tools at all.** Not "please do not edit" in the prompt —
no edit tool in its definition. A reviewer that can fix things starts fixing instead of
finding, and you lose the only reading you had that was not already invested in the
work being right.

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
   *right*. Give it no write tools at all — not as etiquette, as a capability.
3. **A rule you have to remember is a rule that lapses.** When something goes wrong,
   write the lesson *and the check that enforces it*. A lesson with no check is a note,
   and notes do not stop anything.

## Thirty minutes to adopt

1. Copy the files. Delete what does not apply.
2. Fill in `AGENTS.md`: the two or three commands that must pass, and the two or three
   things that must never happen in this repository.
3. Fill in `docs/DEFINITION-OF-DONE.md` with rows you can actually verify. If a row
   cannot be proved by a command's output or a screenshot, cut it or make it provable.
4. Run `node scripts/check-lessons.mjs`. It passes with an empty `lessons/`.
5. Add the hook to your agent's settings so it runs at session start.

## What it costs

A reviewer pass costs tokens and minutes. Writing a lesson costs ten minutes when you
are annoyed and want to move on. Both are cheaper than the thing they catch. Over one
month on a small studio's repositories this shape caught, among others: a client that
read an API error shape the provider never sends (the tests passed because the same
agent had written the fake server to speak the same invented shape), a scheduled query
that would have spent a free tier's whole daily quota once its table grew, and a
performance claim that was true on localhost and false on the deployed site.

Not everything needs this. A script you will run twice does not. A repository other
people depend on does.
