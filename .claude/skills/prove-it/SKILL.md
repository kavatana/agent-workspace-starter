---
name: prove-it
description: After tests pass, prove each new or changed test can fail. Reverts the code a test protects, runs only that test, expects red, restores everything. Use before calling any agent-written change done, or when the user says "prove it", "do the tests bite", or "mutation check".
---

# Prove it

A test that passes on the old code is worse than no test: it is a green light nobody
will question. Agents produce these often, because an agent checks that its pieces agree
with each other, and a test that asserts nothing agrees with everything.

This skill proves, for every test the current change added or edited, that the test
**fails when the thing it protects is taken away**. It changes nothing permanently.

## Rules that are not negotiable

- **Never use `git stash`.** Other sessions may share the stash. Copy files aside instead.
- **Never commit, push, or leave a mutation in place.** Every mutation is restored before
  the next one starts, and `git status` at the end must equal `git status` at the start.
- **One mutation at a time.** Two at once tells you nothing about either.
- If the working tree has changes you did not make, stop and say so before touching
  anything.

## Procedure

1. **Record the starting state**: `git status --porcelain` and the current commit. Find
   the base the change branched from (`git merge-base HEAD origin/main`, or ask).
2. **List the tests in play**: files under test directories that the change added or
   edited (`git diff --name-only <base>...HEAD` plus uncommitted ones).
3. **For each test (or each new test case in an edited file), name what it protects**: the
   production file, and if possible the exact branch or line. Say it in one sentence. If
   you cannot say what would have to break for this test to fail, that is already the
   finding: report it and move on.
4. **Take the protection away**, the cheapest way that is honest:
   - *The fix lives in a changed file*: copy the file aside, then restore the base version
     (`cp file /tmp/prove-it/…; git show <base>:path > path`).
   - *The file is new or the change is one branch*: copy aside, then disable only that
     branch (`if (false && …)`, remove the one call, return the old constant).
5. **Run only that test** (the single file or case, not the suite). Expected: **red**, and
   red for the reason the test's name gives. Red for an unrelated reason (syntax error,
   import failure) does not count: fix the mutation and rerun.
6. **Restore the file from the copy**, rerun the test, expect green. Then the next test.
7. **Finish**: run the whole suite once, confirm `git status --porcelain` matches step 1
   exactly, and delete the copies.

## Report

One table, nothing else first:

| Test | Protects | Mutation | Without the code | Verdict |
| --- | --- | --- | --- | --- |
| `name of the case` | `src/file.ts` the retry branch | branch disabled | failed: "expected paid, got expired" | **bites** |
| `another case` | `src/other.ts` | file restored to base | still passed | **measures nothing** |

Then, for every "measures nothing": why it passes anyway (asserts on a mock's return,
asserts a constant, the fallback path produces the same output, the fixture cannot reach
the branch) and the smallest change to the test that would make it bite. Do not make
that change unless asked: the point of this pass is to find, not to fix.

If a change has no tests at all, say that instead of reporting a clean table.
