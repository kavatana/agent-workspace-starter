---
name: prove-it
description: After tests pass, prove each new or changed test can fail. Decides what to take away, hands the mutation to scripts/prove-it.mjs, which snapshots by hash, runs the named test, restores and verifies. Use before calling any agent-written change done, or when the user says "prove it", "do the tests bite", or "mutation check".
---

# Prove it

A test that passes on the old code is worse than no test: it is a green light nobody
will question. Agents produce these often, because an agent checks that its pieces
agree with each other, and a test that asserts nothing agrees with everything.

This skill proves, for every test the current change added or edited, that the test
**fails under the defect it exists to catch**.

That is a narrower claim than "it fails without your change", and deliberately so. A
characterisation test written around behaviour that already existed, and a test carried
unchanged through a refactor, both pass on either side of the diff and are both worth
having. What neither may do is stay green while the thing they describe is broken.

## You decide, the script moves the files

`scripts/prove-it.mjs` does the dangerous half: it copies the file aside, records its
SHA-256, applies exactly one mutation, runs the test command you name, puts the file
back, checks the hash matches, and deletes the backup only then. If it is interrupted,
the manifest stays on disk and `--recover` finishes the restore.

Never move the files yourself, and **never use `git stash`** — the stash stack is
shared with every other checkout and session on the machine, so a stash here can bury
someone else's work.

```bash
# Start of the pass: nothing should be in progress.
node scripts/prove-it.mjs --status

# Take a file back to what it was at the base commit.
node scripts/prove-it.mjs --file src/pay.ts --revert-to "$(git merge-base HEAD origin/main)" \
  --test "npm test -- src/pay.test.ts" --label "the whole change to pay.ts"

# Or swap in a version you wrote yourself, with one branch disabled.
node scripts/prove-it.mjs --file src/pay.ts --with /tmp/pay-no-retry.ts \
  --test "npm test -- src/pay.test.ts" --label "the retry branch"

# If anything was ever interrupted:
node scripts/prove-it.mjs --recover
```

It prints a line and a JSON object: `bites` is true when the test went red, and
`test.tail` is the end of the output, which is how you tell red-for-the-right-reason
from red-because-you-broke-the-syntax.

## Procedure

1. **Check nothing is in progress**: `node scripts/prove-it.mjs --status`. If it names
   a run, recover it before doing anything else.
2. **Look at the working tree.** If it holds changes you did not make, stop and say so.
   The script restores what it finds, not what was committed, so it is safe — but you
   should still not be mutating someone else's uncommitted work.
3. **List the tests in play**: files under test directories that the change added or
   edited (`git diff --name-only <base>...HEAD`, plus uncommitted ones).
4. **For each test, name the defect it is supposed to catch.** One sentence: the
   production file, and the branch, condition or value that going wrong should make
   this test fail. If you cannot name one, that is already the finding — report it and
   move on without mutating anything.
5. **Build that one defect**, the cheapest honest way:
   - *The change is contained in one file*: `--revert-to <base>`.
   - *The file is new, or the defect is one branch*: write the mutated copy to a
     scratch file (`if (false && …)`, the call removed, the old constant returned) and
     pass it with `--with`.
   One mutation per run. Two at once tells you nothing about either.
6. **Run it** with the narrowest test command that should notice — the single file or
   case, not the suite.
7. **Read the result.** `bites: true` and red for the reason the test's name gives is a
   pass. Red for an unrelated reason (a syntax error, a failed import) does not count:
   fix the mutation and run it again.
8. **Finish**: run the whole suite once, and `--status` again to confirm nothing is
   left behind.

## Report

One table, nothing else first:

| Test | The defect it should catch | Mutation | Under the defect | Verdict |
| --- | --- | --- | --- | --- |
| `name of the case` | `src/pay.ts` stops retrying on a 429 | retry branch disabled | failed: "expected paid, got expired" | **bites** |
| `another case` | — | file reverted to base | still passed | **measures nothing** |

Then, for every "measures nothing": why it passes anyway (it asserts on a mock's return
value, it asserts a constant, the fallback path produces the same output, the fixture
never reaches the branch) and the smallest change to the test that would make it bite.
Do not make that change unless asked: the point of this pass is to find, not to fix.

If a change has no tests at all, say that instead of reporting a clean table.
