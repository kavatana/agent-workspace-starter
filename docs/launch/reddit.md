# Reddit

**Not posted.** Draft.

## The subreddit: r/ClaudeAI

<https://www.reddit.com/r/ClaudeAI/>

**Why this one and not another.** The repository's concrete artefacts are that tool's own
formats — `.claude/agents/*.md` for the reviewer, `.claude/skills/*/SKILL.md` for
`/prove-it` and `/workspace-audit`, a `SessionStart` hook in `.claude/settings.json` — so
a reader there can use it in the next ten minutes without translating anything. The
failures it is built around are that audience's ordinary week: a reviewer that starts
fixing instead of finding, a worktree nobody opens again, a suite that is green because
one author wrote both sides. And the measurements in the write-up came out of that
harness's own transcripts, which is the only place the numbers mean anything.

Rejected for fit, not for rules: the general programming subreddits, where the post would
be one person's tooling with no traction and would read as an advert; the maker
subreddits, where the audience does not run agents against a codebase; and the
model-hosting subreddits, where this is off topic.

## Read the rules before posting — they could not be read from here

Reddit could not be fetched from the machine these drafts were written on, so **nothing
in this file claims to know what r/ClaudeAI's rules say.** Open
<https://www.reddit.com/r/ClaudeAI/about/rules/> and the sidebar first, and check:

1. **Is there a self-promotion rule?** If sharing your own project is forbidden outright,
   do not post this. If it is allowed only in a weekly or pinned thread, post it there
   instead of to the feed.
2. **Is there an account age or karma gate?**
3. **Is a flair required**, and which one fits — a tool, a resource, a write-up?
4. **Is there a rule about links in the body, or about paid products?** If paid products
   are not allowed to be mentioned at all, cut the last paragraph and post the rest; the
   post stands without it.

If any of those forbid it, the answer is to drop this venue, not to reword it.

## Title

```
What running coding agents actually cost me for a day, measured, and the five rules it produced
```

## Body

```
I ran agents across a handful of my own repositories for a day, kept a ledger of
what each round cost and what it found, and then read the session transcripts to see
what was actually processed. Five things surprised me. This is one person's
measurement on their own projects, one day, a small sample — the method transfers,
the figures are mine.

**1. The session that dispatched the agents was about three quarters of everything.**
233,432,490 weighted tokens against 77,136,776 for the seven agent sessions measured
beside it. Nothing was wrong with it; it was just long. It made 3,320 API calls and
its context averaged 509,983 tokens, so every call paid to re-read half a million
tokens. One of its tool calls cost about 70,310 weighted tokens. A whole fresh review
cost 238,791. So three or four tool calls spent deciding are a review not run.

*Rule: end the dispatching session at a milestone, hand anything past a few calls to
a fresh agent with a written brief, batch shell steps.*

**2. A reviewer I kept alive across six rounds cost 206,886 tokens per finding.
Fresh ones cost 8,284.** The resumed agent carried 388,665 tokens of context per
call; a fresh one reading a single prepared package file carried 35,950 and found
more per round. Two rounds against six, on different changes and a different model,
so it's a direction and not a ratio. But one resumed round confirmed three fixes
that tests had already proved, found nothing, and still cost 430,238 tokens — more
than the round that found eight real defects, which cost 378,101.

*Rule: a fresh agent per review, reading one package file. A fix skips its second
look only when it touches exactly what the finding named and something deterministic
in CI proves it.*

**3. A resumed agent is the most expensive way to make an API call.** One researcher,
resumed and asked for 22 more calls: 373,270 tokens. A 120-line script then did the
same kind of work — scanning 1,766 items, pricing 49 — for none.

*Rule: if it's mechanical and happens more than twice, write the script. Agents are
for judgement.*

**4. A suite that was green for days and proved nothing.** The same author wrote the
code that called an outside API and the fake server the tests ran against. They
agreed perfectly with each other and neither agreed with the provider, whose error
body uses a string where the code expected an object. In production every error code
would have been invisible.

*Rule: one test pins each external contract from the vendor's own docs, copied by
hand, fed to the code without passing through your own fake. And after a suite goes
green, break what a test protects and watch it go red.*

**5. A release that was announced and hadn't happened.** A script that waits for
checks and merges exited zero without merging: one API call came back empty, "" was
read as "not open", and "not open" was read as "already merged".

*Rule: verify the fact, not the signal. The PR says merged, the API names a merge
commit, that commit is on the remote default branch, the checks on it are green.*

The files I now keep in every repository because of these — the agent contract, a
reviewer subagent with no edit tool and no shell, a /prove-it mutation pass, lessons
with enforcement, a session-start hook — are here, MIT, no dependencies:
https://github.com/kavatana/agent-workspace-starter

Full write-up with the numbers in context:
https://github.com/kavatana/agent-workspace-starter/blob/main/docs/what-running-agents-costs.md

Disclosure: there's a paid layer ($79) with the tooling those measurements came from,
for people running several agents across several repositories. The repository above
is free and MIT and stays that way, and it's the half I use most days:
{{CHECKOUT_URL}}

Happy to answer questions about any of the five.
```

## After posting

- Answer the first comments yourself. A post nobody defends is a link drop.
- If a moderator asks for the paid line to come out, take it out; the post stands
  without it.
