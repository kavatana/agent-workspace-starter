# X / Bluesky thread

**Not posted.** Draft.

Six posts. Every post is inside X's 280-character limit and Bluesky's 300-grapheme limit
as written, counting the URL at its literal length — X counts a link as 23 characters, so
the posts that carry one have more room there than the count below suggests. Measure
again after any edit:

```
awk '/^> /{sub(/^> /,"");print length($0)"  "$0}' docs/launch/x-bluesky-thread.md
```

No hashtags, no thread-bait, nothing asking to be shared.

---

**1/6**

> I ran coding agents across my own repos for a day and measured it. The session that *dispatched* them cost three quarters of everything: 233,432,490 weighted tokens against 77,136,776 for the seven agent sessions beside it.

**2/6**

> Nothing was wrong with that session. It was just long. 3,320 API calls, context averaging 509,983 tokens, every call paying to re-read it. One of its tool calls cost ~70,310 weighted tokens. A whole fresh review cost 238,791.

**3/6**

> I kept one reviewer alive across six rounds to save re-explaining the codebase: 206,886 tokens per finding. Fresh agents reading one prepared package file: 8,284. Context per call, 388,665 against 35,950. Different changes, so a direction, not a ratio.

**4/6**

> One resumed round confirmed three fixes that tests had already proved, found nothing, and cost 430,238 tokens. The round that found eight real defects cost 378,101. Cost is calls times context, and a resumed agent's context only grows.

**5/6**

> A researcher resumed for 22 more calls cost 373,270 tokens. A 120-line script then did that kind of work — 1,766 items scanned, 49 priced — for none. Mechanical and more than twice? Write the script. Agents are for judgement.

**6/6**

> One person, own projects, one day, small sample. The files I keep in every repo because of this — agent contract, reviewer with no write tools, a mutation pass that proves tests can fail — are MIT: https://github.com/kavatana/agent-workspace-starter

---

## Optional reply, only if someone asks what the paid part is

> There's a paid operations layer ($79, private repo): the two cost scripts these numbers came from, a review package that computes a change's risk tier from the diff, a merge that isn't done until it's read back out of the repo. {{CHECKOUT_URL}}

The repository in post 6/6 is free and MIT and stays that way. Do not lead with the paid
layer, and do not post the reply unprompted.

`{{CHECKOUT_URL}}` is 16 characters as written. A real checkout link will be longer, so
re-run the count command above on this reply after substituting it.
