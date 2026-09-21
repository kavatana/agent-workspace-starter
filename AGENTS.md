# Contract for agents working in this repository

Read this before changing anything. It binds every session, human or agent.

## Before you write

- Read `docs/DEFINITION-OF-DONE.md`. It is what "finished" means here.
- Read `lessons/`. Each file is a mistake already paid for once.
- If the task is unclear, say what is unclear and stop. Do not guess and proceed.

## While you work

- **One outcome per branch, one branch per outcome.** Never work on `main`.
- **A test that does not fail without your change is not a test.** After a suite goes
  green, break the thing the test protects and watch it fail. If it stays green, the
  test measures nothing — fix the test before the feature.
- **Never invent a number.** No performance figure, count, date or price that you did
  not measure or read at its source in this session. Say "not measured" instead.
- **A metric that depends on arrival time** — page load, layout shift, anything a font,
  image or third party can be late for — is claimed only from a deployed URL. A local
  server pays no network and reads clean while the defect is still there.
- **Match the code around you.** Its naming, its comment density, its idioms. A diff
  that reads as foreign is a diff that gets skimmed.

## Before you say it is done

- <!-- FILL IN: the commands that must pass, e.g. `npm test`, `npm run lint`, `npm run build` -->
- Report the output, not a summary of it. "12 passed" is evidence; "tests pass" is not.
- If a step was skipped, say which and why.

## Never, in this repository

- <!-- FILL IN, e.g.: -->
- Commit a secret, a token, or a `.env` value. Reference names only.
- Change files another session left uncommitted, or stash or revert them.
- Push to `main`, merge your own work, or deploy.
- Copy code, data or documents in from another organisation's repository.

## Saying so

If you could not do something, say so in one plain line. An unfinished thing that is
named is manageable; an unfinished thing that is described as finished is a trap for
whoever comes next.
