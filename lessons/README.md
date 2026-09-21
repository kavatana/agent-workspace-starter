# Lessons

One file per mistake that has actually happened here. Not general advice: a thing that
went wrong, what it cost, and the check that now stops it.

The point is the check. A lesson with `enforced_by: none` is a note, and notes lapse.
`scripts/check-lessons.mjs` reads the frontmatter and tells you which ones are still
only notes, and which have happened more than once without anyone making them
executable.

```markdown
---
id: same-as-the-filename
enforced_by: path/to/the/check, or none
occurrences: 1
first_seen: YYYY-MM-DD
---

# A title that states the rule

What happened, plainly, including what it cost.

## Why it happened
The reasoning that seemed sound at the time. This matters more than the mistake: the
same reasoning will produce a different mistake next month.

## The rule
What is done instead, written so that someone who was not there can follow it.
```

Two habits keep this alive:

- Write the lesson while you are still annoyed. A week later you will remember the fix
  and not the reasoning, and the reasoning is the valuable half.
- When a lesson recurs, raise `occurrences` rather than writing a second file. A count
  above one with no check is the file telling you to go and write the check.
