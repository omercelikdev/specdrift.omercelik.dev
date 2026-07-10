---
title: The determinism contract
description: Same inputs, byte-identical report. No network, no clocks, no LLM — and never a forward guess.
---

Every design decision in specdrift falls out of one promise:

> **Same inputs → byte-identical report.**

An agent that cannot reproduce an answer cannot act on it. A reviewer who sees a different report than CI
saw will stop believing both. So the contract is not a nice property; it is the product.

## What the contract forbids

**No network.** Nothing is fetched, ever. This is why `$ref` resolves only internal `#/…` pointers — a
remote reference would make the report depend on someone else's uptime.

**No clocks in the output.** No timestamps, no durations, no "checked at". Two runs a week apart produce
identical bytes.

**No LLM.** specdrift never calls a model. Models call specdrift. See
[Why specdrift](/why-specdrift/#the-inversion-llms-call-it).

**No unordered iteration.** Directory scans are sorted with an ordinal comparison before anything is read.
Findings come back in declaration order for rules, and in document order for schema assertions. The report
is stable across machines and filesystems.

**No hidden state.** No cache directory, no lockfile, no home-directory config. Everything specdrift reads
is a path you passed it or a profile inside the repository you pointed at.

## Never guess forward

Three inputs carry a version, and an unrecognized value in any of them is a hard failure — exit `2`,
nothing checked:

| Input | Field | On mismatch |
|-------|-------|-------------|
| `rules.yaml` | `version` | `Rules version 2 is not understood by this engine (supported: 1) — never guess forward.` |
| `.specdrift/drift.yaml` | `version` | Same, for the profile |
| Your manifest | `schemaVersion` | `SPEC0221` — an error finding, not a crash, because the profile *did* load |

And the same instinct governs the schema evaluator: an [unknown keyword is a hard fail](/schema-validation/#an-unknown-keyword-is-a-hard-fail),
never a silent skip.

The alternative — interpreting version 2 with version 1's rules — produces a *confident, wrong* report.
That is the single worst thing this tool could do, so it is the single thing it refuses to do.

## Warnings inform, errors gate

The exit code depends only on whether an **error** finding exists. Warnings are printed, counted, and
never gate.

This lets you introduce a rule as a warning, watch it fire across real repositories for a release, and
promote it to an error once you trust it — without ever having shipped a gate you had to revert.

## Semantic comparison, not textual

Where a byte comparison would produce false drift, specdrift compares meaning instead. A committed OpenAPI
document and a freshly built one are compared as JSON trees: reformatting, indentation and key order are
not drift, because they are not.

The inverse also holds, and it is the honest half: [wiring detection *is* textual](/drift-detection/#what-textual-really-means),
and the documentation says so plainly rather than implying a rigor the scan does not have. A tool that
oversells its certainty spends the trust it was built to earn.

## Messages are part of the contract

A finding must carry a rule id, a severity, a path, and a message that teaches the fix. specdrift refuses
to load a rule with no message.

Determinism means the same inputs produce the same report. It does not automatically mean the report is
worth reading. Both are required.
