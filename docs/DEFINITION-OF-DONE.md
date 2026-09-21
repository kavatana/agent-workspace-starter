# Definition of done

A change is done when every row below is true **and proved**. The proof is a command's
output, a screenshot, or a URL. Never a sentence claiming it.

Keep the list short enough that people actually run it. Cut a row rather than let it
become decoration.

| # | Row | Proved by |
| --- | --- | --- |
| 1 | It does the job end to end. A named kind of user completes the thing without help, on the deployed URL, not on a developer's machine. | A recorded walkthrough, or a test that drives the real path |
| 2 | Tests cover the change, and each new test fails without it. | The suite's output, plus the failure you saw when you broke it |
| 3 | Errors are handled and shown. The failure path was run, not imagined. | The output or screenshot of the failure case |
| 4 | Nothing secret is in the repository or the logs. | The secret scan's output; a log line with the sensitive field redacted |
| 5 | It works at phone width and desk width, reachable by keyboard, labelled. | Screenshots at two widths; an accessibility check with zero critical items |
| 6 | Anyone can run it: how to start it locally, the variables by reference name, how to deploy, how to roll back. | The README section, followed by someone who did not write it |
| 7 | Every public claim matches what is deployed. | The live URL beside the claim |
| 8 | Numbers that depend on the network are measured on the deployed URL, several runs, reported as a range. | The report file or the tool's output |

## How to use it

- Put the table in each repository and keep the state per change, not in your head.
- `unknown` is an honest state. A row nobody has verified is not a passing row.
- When a row cannot be proved by anything, it is an opinion. Either give it a number or
  take it out.

## Order

Rows 1, 2 and 6 first. A change nobody can run, or whose instructions lie, is worth
nothing however well it is written. The rest follow.
