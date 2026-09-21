# What running agents costs, and the five rules it cost me

I ran coding agents across my own repositories for a day, kept a ledger of what each
round cost and what it found, and then read the session transcripts to see what was
actually processed. The two numbers are not the same number. The one the harness prints
when a round ends is a summary. The transcript holds the `usage` of every API response,
and a long session pays for its whole context on every call, so the transcript number is
several times larger.

Everything below is one person's measurement, on their own projects, on one day, with one
model family behind a subscription. It is a small sample. None of it is money: a
subscription's limits are not published in token terms, so "weighted" prices each token
kind at its list-price ratio — a cached read 0.1, a cache write 1.25, an output token 5,
per input token — and lets two sessions be compared with each other. It is not a bill,
and it is not a benchmark. The method transfers. The figures are mine.

Five things surprised me. Each one ended as a rule.

## 1. The session that dispatched the agents was three quarters of everything

I assumed the agents were the expense. They were not. The session that briefed and
dispatched them came to **233,432,490 weighted tokens against 77,136,776 for the seven
agent sessions measured beside it** — about three quarters of the total.

The mechanism is dull and total: that session made **3,320 API calls** and its context
averaged **509,983 tokens**, so every one of those calls paid to re-read half a million
tokens. Nothing was wrong with it. It was just long, and length is the whole cost.
One of its tool calls cost about **70,310 weighted tokens**. A whole fresh review, start
to finish, cost **238,791**. Three or four tool calls spent deciding are a review not run.

**The rule:** end the dispatching session at a milestone rather than letting it run all
day, hand anything past a few calls to a fresh agent with a written brief, and batch
shell steps instead of taking ten turns to do one thing. Past roughly 100,000 tokens of
context, a cold agent is the cheap way to do work, not the expensive one. That reversed
what I believed when I started.

## 2. A resumed reviewer cost 206,886 tokens per finding. A fresh one cost 8,284

I kept one reviewer alive across six rounds, because re-explaining the codebase felt
wasteful. Reading the ledger back:

```
  role · tier             rounds      tokens  findings  on re-check  tokens/finding  empty reviews
  reviewer · deep              6   3,103,287        15            1         206,886              1
  reviewer · standard          2     124,257        15            0           8,284              0
```

The six deep rounds are that one resumed agent. It found 15 real defects at about
207,000 tokens each. The two standard rounds are fresh agents, each reading a single
prepared package file instead of hunting through the repository: 15 defects between them
for 124,257 tokens.

That is not a fair fight — different changes, a different model, two rounds against six —
so it is a direction and not a ratio. But the mechanism behind it is not ambiguous. The
resumed agent carried **388,665 tokens of context per call**; the fresh one carried
**35,950** and made **12 calls**. Cost is calls multiplied by context, and a resumed
agent's context only grows. One of the resumed rounds confirmed three fixes that tests
had already proved, found nothing, and still cost **430,238 tokens** — more than the
round that found eight real defects, which cost **378,101**.

Fourteen of that agent's fifteen findings came from a first look. The fifteenth came from
a re-check, and it was in code the fix itself had added.

**The rule:** a fresh agent for every review, reading one package file. A fix skips its
second look only when it touches exactly what the finding named and something
deterministic in CI proves it; a fix that adds code needing judgement keeps its second
look, because that is where the one re-check finding lived.

## 3. A resumed agent is the most expensive way to make an API call

One researcher, resumed and asked for 22 more calls, cost **373,270 tokens**. A
120-line script then did the same kind of work — scanning 1,766 items and pricing 49 of
them — for none.

I reached for the agent because it was already there and the script was not. That is a
real reason, and still the wrong trade past the second repetition.

**The rule:** if the work is mechanical and will happen more than twice, write the
script. Agents are for judgement.

## 4. A green suite that proved nothing

A service talked to an outside API. The same author wrote the calling code and the fake
server the tests ran against. The suite was green for days. The provider documents its
error body with a string field; the code only understood an object, and the fake spoke
the same invented shape, so the two agreed perfectly with each other and neither agreed
with the provider. In production every error code would have been invisible.

This is the failure mode that worries me most, because it does not look like a failure.
An agent is extremely good at making its own pieces agree with each other. Consistency is
not correctness, and a passing test is more dangerous than a missing one — nobody
questions a green light. The full write-up is in this repository:
[`lessons/a-green-suite-can-prove-nothing.md`](../lessons/a-green-suite-can-prove-nothing.md).

**The rule:** where code talks to something outside the repository, one test pins that
contract from the vendor's own documentation, copied by hand, and feeds it to the code
without passing through your own fake. And after any suite goes green, break the thing a
test protects and watch it go red. `/prove-it` in this repository does that pass for you.

## 5. A release that was announced and had not happened

A script that waits for checks and merges exited zero without merging. One API call came
back empty, `""` was read as "not open", and "not open" was read as "already merged". The
merge was reported as done. It had not happened.

**The rule:** verify the fact, not the signal that was supposed to cause it. The pull
request says merged, the API names a merge commit, that commit is on the remote default
branch, and the checks on that commit concluded green. An exit code is a claim about a
script, not about a repository.

## What this does not tell you

Not your numbers: different repositories, models, prompts and review definitions move all
of it. Not money. Not proof that a fresh reviewer beats a resumed one — two rounds
against six, on different work. Nothing here is a promise about savings. Your own ledger
is the only thing that can answer this about you, and it costs a line after each round.

## Free and paid

**Free:** this repository — the contract, the read-only reviewer, `/prove-it`,
`/workspace-audit`, the lessons with their checker and the session-start hook. MIT, no
account, no install step, tests on Node 18, 20 and 22.

**Paid, $79:** a private repository with the operations layer these numbers came from —
the two cost tools, a review package that computes a change's risk tier from its own
diff, the merge-and-receipt pair from rule 5, a three-state workspace scanner, eight past
incidents as pure gate functions with tests, brief templates, and the measurement method
written out in full.

**Where:** {{CHECKOUT_URL}}

**If the free half is all you need, that is a complete outcome — it is what I use most
days.**
