---
id: a-green-suite-can-prove-nothing
enforced_by: none
occurrences: 1
first_seen: 2026-09-21
---

# A green suite can prove nothing when one author wrote both sides

A service talked to a payment provider. An agent wrote the client, and the same agent
wrote the fake server the tests run against. Two hundred tests passed for days.

The provider documents its error body as `{ "error": "payment_not_found", "message":
"..." }`, where `error` is a string. The client only understood
`{ "error": { "code": "..." } }` — a shape that provider never sends. The fake server
spoke the same invented shape, so the two agreed perfectly and neither agreed with the
provider. In production every error code would have been invisible: "no such payment"
would have arrived as a generic failure, and a checkout that depended on that answer
could never have closed.

## Why it happened

The suite was read as evidence about the world. It was evidence about internal
consistency, which an agent is extremely good at producing. Nobody opened the
provider's documentation, because the file's own comment said the documentation gave no
error shape — a sentence the same author had written.

## The rule

Where code talks to something outside the repository, one test pins that contract from
the vendor's own documentation, copied by hand, and feeds it to the code **without
going through your own fake**. If the code and the fake ever drift together again, that
test breaks.

And after any suite goes green, break the thing a test protects and watch it fail. A
test that passes on the old code is worse than no test: it is a green light nobody
will question.
