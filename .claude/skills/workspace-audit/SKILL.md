---
name: workspace-audit
description: Audit this repository's AI-agent setup for wasted tokens and for steps that cost effort and catch nothing. Measures what every session pays before work starts, finds rules nothing enforces and gates that cannot fail, and ranks what to cut, fix or keep. Read-only. Use when the user says "audit my workspace", "why is this so expensive", "is this flow wasteful", or before adopting a new agent workflow.
---

# Workspace audit

Two kinds of waste hide in an agent workspace, and they need different eyes.

**Tokens you pay every session** whether or not they help: instructions loaded on every
turn, tool descriptions for servers nobody uses, hooks that print a page into the context.

**Steps you pay effort for that catch nothing**: a rule nothing enforces, a gate that has
never failed, a review that re-confirms what a test already proved, a document that
describes a system that has moved on.

This audit finds both. It changes nothing: it reads, measures, and reports. Everything it
reads stays in this workspace; do not copy findings that quote code or internal documents
anywhere else.

## Rules

- **Read-only.** No edits, no installs, no commits. Propose; the person decides.
- **Measure, do not estimate, wherever a measurement exists.** A file's size is a
  measurement. "This feels heavy" is not. Tokens ≈ characters ÷ 4 is close enough to rank.
- **Never recommend cutting a safety check to save tokens.** Cheaper is only better when
  what it catches is caught some other way. Say how.

## 1. What every session pays before any work starts

Measure each, in characters and approximate tokens, and total them:

- Instruction files loaded automatically: `CLAUDE.md` and `AGENTS.md` here, in parent
  directories, and at user level (`~/.claude/CLAUDE.md`); any files they import with `@`.
- Anything those files tell the agent to "read first". It is paid on every session too.
- Memory or index files loaded at start.
- What each session-start and prompt-submit hook prints (run it and measure its output).
- Connected tool servers (`.mcp.json`, user-level config, plugins): for each, is it
  authenticated, and when was a tool from it last actually used? A server that is
  connected and never used still costs its tool descriptions on every turn.
- Skills, agents and plugins installed: count them, and list any with no sign of use.

Then answer: **how many tokens does a session spend before the first useful action**, and
which three items are most of it?

## 2. Instructions that do not earn their place

For every rule in the instruction files, sort it into one of four:

| Kind | Test | Verdict |
| --- | --- | --- |
| Enforced | A script, hook, test or CI step fails when it is broken | Keep; consider deleting the prose and keeping the check |
| Checkable, not enforced | It *could* be a script and is not | The best finding in this audit: name the check |
| Judgement | Genuinely needs a person or a reviewer | Keep, and make it short |
| Dead | Describes a tool, path, command or process that no longer exists | Verify by looking, then recommend removal |

Flag duplicates (the same rule in two files drifts), contradictions, and anything written
as an essay that could be one line.

## 3. Gates that cannot fail

List every automatic check (pre-commit, CI jobs, verify scripts, hooks). For each:

- When did it last fail? (`git log`, CI history.) A gate that has never failed is either
  guarding something that never breaks, or not checking what it claims to.
- What would have to go wrong for it to fail? If you cannot say, that is the finding.
- Does it run in CI, or only locally where it can be skipped?
- How long does it take? A slow gate gets bypassed.

## 4. How agents are being used

Look at the workflow as practised (briefs, agent definitions, scripts, recent history):

- **Resumed or fresh?** An agent's cost follows the length of its history, not the size of
  its task. A long-lived agent asked to do a small thing pays for everything it has ever
  read. Re-checks and small tasks belong to a fresh agent with a short brief.
- **Agent or script?** Looping over an API or a set of files and tabulating results is a
  script. Agents should read what scripts produce.
- **Files or paste?** Long material pasted into prompts is paid again on every turn. Briefs,
  diffs and reports should move as files.
- **One depth for everything?** If a typo and a payment change get the same review, either
  the typo is overpaid or the payment is underpaid. Look for tiers by risk.
- **Re-review of proven fixes?** A fix proved by a test that failed before it and passes
  after it does not need a second opinion. A fix that needs judgement does.
- **Session length.** Multi-day sessions re-read their own history on every tool call.
  Is there a hand-off mechanism (a queue, a state file) that makes short sessions cheap?

## 5. Documents that have stopped being true

Sample the docs an agent is told to trust (README, runbooks, architecture notes). For five
concrete claims (a command, a path, a URL, a version, a count) check each against the
repository. Report the ratio. Stale docs are worse than none: an agent believes them.

## Report

Lead with one table, ranked by what it saves, and nothing before it:

| # | Finding | Evidence (measured) | Costs now | Do this | Risk of doing it |
| --- | --- | --- | --- | --- | --- |

Then three short lists: **Cut** (pure waste), **Convert** (a rule that should become a
check — name the check), **Keep** (things that look expensive and are worth it, so nobody
cuts them later by mistake).

End with the single change that would save the most, and the single thing that must not
be touched. If the workspace is already lean, say so plainly; an audit that invents
findings is its own kind of waste.
