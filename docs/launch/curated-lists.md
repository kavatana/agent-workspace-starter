# Curated lists

**No pull request here has been opened.** These are drafts.

Five lists take pull requests, publish their rules, and have an audience. Each section
below quotes the rule that constrains what we write, gives the exact line to add and
where it goes, and gives the pull request title and body. Six more lists were checked and
ruled out; they are at the bottom with the rule that ruled them out, because knowing
where not to send something is worth as much as the five.

Star counts and rule quotations were read on 2026-09-21. Read the rules again before
opening anything: they change, and a pull request that breaks a rule the maintainer wrote
down is closed without being read.

**One item per pull request.** Only one of the five writes that down — webfuse's rules
say "Make an individual pull request for each suggestion" — but it is the convention all
five follow, and a pull request that adds two entries gives a maintainer a reason to
close both.

---

## 1. awesome-ai-coding-tools

- List: <https://github.com/ai-for-developers/awesome-ai-coding-tools> (2,094 stars, MIT)
- Rules: <https://github.com/ai-for-developers/awesome-ai-coding-tools/blob/main/CONTRIBUTING.md>

**What the rules require.** Tools that are "AI-powered or AI-enhanced", "specifically
useful to developers", "publicly accessible and have at least a free tier", and "well
documented and have a clear use case". Format: `- **[Tool Name](https://example.com)** –
One-line description of what it does.` Placement: "Add your tool to the end of the
relevant section."

**Self-promotion.** Not restricted. The list carries no age, star or traction gate, and
its recent entries are plainly submitted by their own authors. This repository qualifies
on every stated requirement: MIT, public, no account, documented, with CI.

**Where.** End of `## Code Review and Refactoring` in `README.md` — the section already
holds the closest neighbours (a two-person builder/reviewer rule, a guardrail for
AI-written code). Note the format uses an en dash, not a hyphen.

**The exact line to add:**

```markdown
- **[Agent Workspace Starter](https://github.com/kavatana/agent-workspace-starter)** – Repository files that make a coding agent's work checkable by a person: an agent contract, a reviewer subagent defined with no edit tool and no shell, a `/prove-it` mutation pass that takes away what each new test protects so the test has to go red, lessons that each either name an enforcing check or are marked as notes, with a script that says which, and a session-start hook that reports abandoned worktrees and held ports. Node 18+, no dependencies, MIT.
```

**Pull request title:**

```
Add Agent Workspace Starter to Code Review and Refactoring
```

**Pull request body:**

```
Adds one entry to the end of Code Review and Refactoring.

What it is: a set of repository files that put a check between a coding agent's work
and the person merging it — an AGENTS.md contract, a reviewer subagent defined without
an edit tool or a shell (so it finds rather than fixes), a /prove-it skill that mutates
what each new test protects and requires the test to go red, a lessons folder where
every entry either names the check that enforces it or is marked as a note, and a
SessionStart hook that reports what the previous session abandoned, including what it
could not check and why.

Against the guidelines:

- AI-enhanced and specifically for developers: it is tooling for people running coding
  agents against their own repositories.
- Publicly accessible with a free tier: the whole repository is MIT with no account and
  no install step.
- Documented with a clear use case: README covers adoption, the hook wiring, the
  AGENTS.md pitfall, and what the guard does not do.
- One item, added at the end of the section, in the documented format.

Tests run on Node 18, 20 and 22 in CI on every push and pull request.

Disclosure: I am the author, and there is a separate paid operations layer that builds
on this. The repository linked here is MIT and stays free.
```

---

## 2. awesome-claude-skills (BehiSecc)

- List: <https://github.com/BehiSecc/awesome-claude-skills> (10,161 stars)
- Rules: the `## 🤝 Contribution` section of
  <https://github.com/BehiSecc/awesome-claude-skills/blob/main/README.md> — "Fork this
  repo / Make your changes / Submit a Pull Request."

**What the rules require.** Only the fork-and-PR flow is stated. The entry format is set
by the list itself: `- [name](url) - Description.`, one line, description ending in a
period. Entries link either to a skill directory or to the repository that holds it.

**Self-promotion.** Not restricted, and no traction gate is published. The list is
overwhelmingly made of authors' own skills.

**Where.** `## 🛠 Development & Code Tools` in `README.md`, at the end of the section. The
entry names the skill, not the repository, because that is what this list indexes.

**The exact line to add:**

```markdown
- [prove-it](https://github.com/kavatana/agent-workspace-starter/tree/main/.claude/skills/prove-it) - Proves each new test can actually fail: snapshots the files by SHA-256, applies one mutation that removes what the test protects, runs the test you name, restores, verifies every hash, and deletes the backups only then. `--recover` finishes an interrupted run. Ships alongside an agent contract, a reviewer subagent with no write tools and a session-start hook.
```

**Pull request title:**

```
Add prove-it skill (mutation check for agent-written tests)
```

**Pull request body:**

```
Adds one entry to Development & Code Tools.

prove-it answers a question a green suite cannot: can this test fail? After the suite
goes green, the skill decides what to take away, and the script snapshots the affected
files by SHA-256, applies one mutation, runs the test you name, restores everything and
verifies every hash before deleting its backups. An interrupted run is finished with
--recover rather than left half-applied.

It exists because in one week of agent-written tests, several passed identically before
and after the change they were written for. The bar it enforces is not "it fails
without your change" — a characterisation test passes on both sides by design — but
"it fails under a defect it is supposed to catch".

MIT, Node 18+, no dependencies. The skill has its own tests, which run on Node 18, 20
and 22 in CI.

Disclosure: I wrote it.
```

---

## 3. awesome-generative-ai — Discoveries list

- List: <https://github.com/steven2358/awesome-generative-ai> (12,661 stars, CC0)
- Rules: <https://github.com/steven2358/awesome-generative-ai/blob/main/CONTRIBUTING.md>

**What the rules require.** Format: `[ProjectName](Link) - Description.`, entries added
"to the bottom of their respective category", descriptions "concise, clear, and
straightforward" and ending with a period, and "open-source projects should include the
tag #opensource at the end". Quality standards: widely used and useful, actively
maintained, well documented. Reviewed by hand, first in first out.

**What that decides here.** The **main** list needs "at least 1,000" followers or the
maintainer's personal interest. This repository has neither, so the main list is not the
target and asking for it would waste a hand review. The rules name the alternative
themselves: projects that do not meet the main-list criteria go to
[`DISCOVERIES.md`](https://github.com/steven2358/awesome-generative-ai/blob/main/DISCOVERIES.md),
"a special showcase for the community", submitted the same way. That is where this goes.

**Self-promotion.** Allowed: submitting your own project by pull request is the
documented route.

**Where.** Bottom of `### Developer tools`, under `## Coding`, in **`DISCOVERIES.md`** —
not `README.md`.

**The exact line to add:**

```markdown
- [Agent Workspace Starter](https://github.com/kavatana/agent-workspace-starter) - Repository files that make a coding agent's work checkable by a person: a contract every session is bound by, a reviewer defined without write tools, a mutation pass that proves each new test can fail, and a session-start hook that reports what the last session left unfinished. #opensource
```

**Pull request title:**

```
Add Agent Workspace Starter to Discoveries (Coding > Developer tools)
```

**Pull request body:**

```
Adds one entry to the bottom of Coding > Developer tools in DISCOVERIES.md.

Submitting to Discoveries rather than the main list: the project does not meet the
main-list criterion of at least 1,000 followers, and the guidelines point projects in
that position here.

What it is: a small set of files that put a check between a coding agent's work and the
person merging it — an AGENTS.md contract every session is bound by, a reviewer subagent
defined with no edit tool and no shell, a /prove-it mutation pass that takes away what
each new test protects and requires it to go red, a lessons folder where each entry
either names the check that enforces it or is marked as a note, and a session-start
hook that reports abandoned worktrees and held ports, and says "not checked" with a
reason when it could not look.

Format: entry at the bottom of the category, description ending with a period,
#opensource tag as required. MIT, Node 18+, no dependencies, tests on Node 18, 20 and 22
in CI.

Disclosure: I am the author.
```

---

## 4. awesome-claude (webfuse)

- List: <https://github.com/webfuse-com/awesome-claude> (1,674 stars, CC0)
- Rules: <https://github.com/webfuse-com/awesome-claude/blob/main/contributing.md>

**What the rules require.** "Make an individual pull request for each suggestion."
Format: `- [Project Name](link) - Description.` "Start the description with a capital and
end with a full stop." Added "to the bottom of the relevant category". Projects "must be
open source and have a public repository", "actively maintained", with "meaningful
functionality beyond basic examples" and "good documentation". The pull request "should
have a useful title and include a link to the project and why it should be included".
"New categories, or improvements to the existing categorization are welcome."

**The one risk, stated plainly.** The rules also say projects "should demonstrate
community engagement (reasonable stars/forks for their age)". This repository is new and
has no stars. "For their age" is the qualifier that makes the ask reasonable, but a
maintainer may still say not yet — and if they do, that is a fair answer, not something
to argue with.

**Self-promotion.** Not restricted.

**Where.** Bottom of `### 🤖 Claude Code`, under `## 🛠️ Claude Code & Model Context
Protocol (MCP)`. That subsection currently holds first-party links only, so the pull
request offers the maintainer a new subsection instead, using the rule that invites
categorization improvements. Note the list's existing lines put two spaces after the
dash; the documented format has one, and the line below follows the documented format.

**The exact line to add:**

```markdown
- [Agent Workspace Starter](https://github.com/kavatana/agent-workspace-starter) - Starter files that make a coding agent's work checkable by a person: an agent contract, a reviewer subagent with no write tools, a mutation check that proves each new test can fail, and a session-start hook.
```

**Pull request title:**

```
Add Agent Workspace Starter under Claude Code
```

**Pull request body:**

```
Adds one entry to the bottom of Claude Code.

Link: https://github.com/kavatana/agent-workspace-starter

Why it belongs here: it is a working set of the formats this section is about —
.claude/agents/*.md for a reviewer defined with no edit tool and no Bash,
.claude/skills/*/SKILL.md for a mutation pass that proves each new test can fail, and a
SessionStart hook that reports what the previous session left unfinished. It also
documents a trap that costs people quietly: a CLAUDE.md, .claude/CLAUDE.md or
CLAUDE.local.md anywhere above your working directory means AGENTS.md stops being read,
and nothing tells you.

Against the project standards: open source (MIT) with a public repository, actively
maintained, documented end to end in the README, and every script has tests that run on
Node 18, 20 and 22 in CI. It is new, so it has no star history yet — if that is the bar,
I am happy to come back later.

On placement: the Claude Code subsection is currently first-party links only. If a
community entry sits awkwardly there, I will move it to a new subsection under the same
heading — say "Workspace Templates" — or anywhere you prefer. Just say which.

Disclosure: I am the author. The repository is MIT and free.
```

---

## 5. awesome-claude-code (jqueryscript)

- List: <https://github.com/jqueryscript/awesome-claude-code> (518 stars, CC0)
- Rules: the `## Contribution Guidelines` section of
  <https://github.com/jqueryscript/awesome-claude-code/blob/main/README.md>, which reads
  **"Under Construction"** in full.

**What that means for us.** There are no published rules to follow, so the pull request
follows the list's own observed conventions exactly and changes nothing else: one line,
the existing format `- [**name**](url) - (N ⭐) - Description.`, and the section's
ordering, which runs from the highest star count down. The section's last entry today
sits at `(0 ⭐)`, so a 0-star entry is within the list's own practice and the line goes
after it.

**Self-promotion.** Nothing published forbids it.

**Where.** End of `## 🛠️ Tools & Utilities` in `README.md`.

**The exact line to add:**

```markdown
- [**agent-workspace-starter**](https://github.com/kavatana/agent-workspace-starter) - (0 ⭐) - Repository files that make a coding agent's work checkable by a person: an agent contract, a reviewer subagent with no edit tool and no shell, a mutation check that proves each new test can fail, lessons that each either name an enforcing check or are marked as notes, and a session-start hook that reports abandoned worktrees.
```

**Pull request title:**

```
Add agent-workspace-starter to Tools & Utilities
```

**Pull request body:**

```
Adds one entry at the end of Tools & Utilities, in the list's existing format and in
star order (the section's last entry is at 0 ⭐, and so is this one).

What it is: repository files that put a check between a coding agent's work and the
person merging it — an AGENTS.md contract, a reviewer subagent defined with no edit tool
and no Bash, a /prove-it skill that mutates what each new test protects so the test has
to go red, lessons that each either name an enforcing check or are marked as notes, and
a SessionStart hook that reports abandoned worktrees and held ports, and says "not
checked" with a reason rather than turning a failed command into "nothing found".

MIT, Node 18+, no dependencies, tests on Node 18, 20 and 22 in CI.

The Contribution Guidelines section currently reads "Under Construction", so I have
followed the existing entries' format and placement exactly and changed nothing else.
Tell me if you would rather it went elsewhere, or if the star count should be omitted.

Disclosure: I am the author.
```

---

## Checked, and not submitted

Each of these was read at its own rules page on 2026-09-21. None is a maybe.

| List | Stars | Why not |
| --- | --- | --- |
| [hesreallyhim/awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) | 54,384 | Pull requests are forbidden: "Do not open a PR. Just fill out the form", and "It is **not** possible to submit a resource recommendation using the `gh` CLI." Recommendations "must be created by human beings". Its ground rules also require a resource to be "at least 14 days old … AND show signs of active development" or have "at least 100 stars" — this repository's first commit is 2026-09-21, so the earliest eligible date is **2026-10-05**. That is a person filling in a web form on or after that date, not a pull request, and not something an agent may do. |
| [travisvn/awesome-claude-skills](https://github.com/travisvn/awesome-claude-skills) | 15,126 | "if your skill hasn't acquired a basic 10 stars, it will be closed automatically." This repository has none. The same file also says the list is "not a jumping off point for your new venture" and rejects anything that is "clearly just a segue to a paid product". Revisit only if the free repository earns stars on its own. |
| [kyrolabs/awesome-agents](https://github.com/kyrolabs/awesome-agents) | 2,826 | "We do not list content that is: brand new repo without demonstrated traction", and "Given the rise of agent submissions, those criteria are non-negotiable, managed and applied automatically." A pull request today is auto-closed. |
| [sindresorhus/awesome](https://github.com/sindresorhus/awesome) | 508,484 | Its own description says "Pull requests are temporarily disabled". It also lists awesome lists, not tools, so this would be the wrong shape even when they reopen. |
| [VoltAgent/awesome-claude-code-subagents](https://github.com/VoltAgent/awesome-claude-code-subagents) | 25,234 | Contributing means adding an agent definition file into their catalogue and updating three of their files, not adding a link. That is donating the reviewer agent to someone else's collection, which is a different decision from listing this repository, and not one to take by default. |
| [ComposioHQ/awesome-claude-skills](https://github.com/ComposioHQ/awesome-claude-skills) | 75,429 | Same shape: a contribution is a skill folder with its own `SKILL.md` committed into their repository, not an entry pointing at yours. |

## Before opening any of the five

1. Re-read that list's rules. Every quotation above has a date on it for a reason.
2. Check the list for an existing entry. Only webfuse's rules ask for this in writing
   ("Search previous suggestions before making a new one"), but a duplicate wastes a
   maintainer's time everywhere.
3. One entry, one pull request, one commit. Do not reformat anything else in the file.
4. Keep the disclosure line. Every one of these is a first-party submission, and a
   maintainer who works it out for themselves is right to close it.
5. **No checkout link in any entry or any pull request body.** These lists index the free
   repository, and some of them close submissions that read as a funnel to a paid
   product. The paid layer is named in the disclosure and left unlinked, which is why the
   checkout placeholder appears nowhere in this file.
