# Show HN

**Not submitted.** Draft.

## The venue's rules, read at its own page

From [news.ycombinator.com/showhn.html](https://news.ycombinator.com/showhn.html):

- "Show HN is for something you've made that other people can play with" — something
  people can "run on their computers or hold in their hands".
- "Off topic: blog posts, sign-up pages, newsletters, lists, and other reading material.
  Those can't be tried out, so can't be Show HNs."
- "Please don't ask friends to upvote or comment. That's not ok on HN."
- Make it "easy for users to try your thing out, ideally without barriers such as
  signups or emails".
- The title begins with "Show HN".

**What that decides here.** The submission is the repository, not the write-up — the
write-up is reading material and would be off topic as a Show HN. The repository is MIT,
has no dependencies and no install step, so there is no barrier to trying it. The paid
layer exists, so it is disclosed in the author's own first comment rather than left for
someone to discover; it is not in the title and it is not the link. Nobody is asked to
upvote.

## Title

```
Show HN: Files that make a coding agent's work checkable by a person
```

68 characters. Hacker News truncates titles over 80.

## URL to submit

```
https://github.com/kavatana/agent-workspace-starter
```

## First comment, posted by the author right after submitting

```
I run coding agents across a handful of my own repositories, and everything here
came from something that went wrong once.

What's in it:

- AGENTS.md, a contract every session is bound by, including sessions I didn't start.
- A reviewer subagent with no edit tool and no shell. Not "please don't edit" in the
  prompt — no write capability in the definition, because a reviewer that can fix
  things starts fixing instead of finding. There's a second, rarer one that gets a
  shell behind a guard, for reviews that can't be done by reading.
- /prove-it, a mutation pass: after the suite goes green it takes away what each new
  test protects and the test has to go red. In one week of agent-written tests this
  caught several that passed identically before and after the change they were
  written for.
- lessons/, one file per mistake, each either naming the check that now stops it or
  honestly marked as a note, and a script that tells you which ones are still only
  notes.
- A session-start hook that reports what the last session left behind — uncommitted
  work in a worktree nobody will open again, a dev server still holding a port — and
  says "not checked", with the reason, when it couldn't look. A scanner that turns a
  failed command into "nothing found" is worse than no scanner.

Node 18+, no dependencies, no install step. The tests run on Node 18, 20 and 22 in
CI, so the version claim is checked rather than asserted.

The idea in one line: an agent is very good at making its own pieces agree with each
other, and consistency is not correctness. Every file here puts a check between the
agent's work and the world.

Two things I got wrong that are worth more than the code:

1. I kept one reviewer agent alive across six rounds to save re-explaining the
   codebase. It cost 206,886 tokens per finding. Fresh agents reading a single
   prepared package file cost 8,284. Different changes and a different model, so
   it's a direction and not a ratio — but the mechanism is that the resumed agent
   carried 388,665 tokens of context per call and the fresh one carried 35,950.
2. The session that dispatched the agents cost more than all the agents together:
   233,432,490 weighted tokens against 77,136,776 for the seven agent sessions
   measured beside it, because its context averaged 509,983 tokens and every one of
   its 3,320 calls re-read it.

The longer write-up, with the three other things that went wrong and the rule each
one produced, is in the repo:
https://github.com/kavatana/agent-workspace-starter/blob/main/docs/what-running-agents-costs.md
One person's measurement on their own projects, one day, a small sample.

Disclosure: there's a paid layer ($79, private repo) with the tooling those
measurements came from — the cost scripts, a review package that computes a change's
risk tier from the diff, a merge that isn't called done until it's read back out of
the repository, and eight past incidents as pure gate functions. Everything in the
repository above is free and MIT and stays that way. I'd rather you took the free
half; it's what I use most days.

Happy to answer anything.
```

## Before posting

- Replace nothing. The checkout placeholder that the other drafts in this folder carry is
  deliberately absent here: the paid layer is described, not linked, so the comment is
  not a sales link.
- Post from an account that has been used for something other than this.
- Be around for the next few hours to answer. The rules ask for someone "who's around to
  discuss" it.
