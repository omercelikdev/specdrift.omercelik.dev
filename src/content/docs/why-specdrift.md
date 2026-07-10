---
title: Why specdrift
description: The gap between artifacts is where manifest-driven systems rot — and where no existing tool looks.
---

A golden path — a manifest that generates an application — lives or dies by one promise:

> The manifest is the single source of truth.

Every tool you already run defends *one artifact at a time*.

- A **JSON Schema** proves the manifest has the right shape. It cannot know whether the feature it
  declares was ever wired.
- A **static analyzer** proves the code compiles and follows your rules. It cannot know what the manifest
  claims about it.
- **Tests** prove behavior. They pass happily when the manifest and the code have quietly disagreed for
  three months.

Nothing watches the space *between* the artifacts. That space is where "the manifest says X, the repo
does Y" rots silently, and it is exactly where AI-generated changes decay.

## How the rot happens

None of these are exotic. Each one has passed every gate in a normal repository:

- A model adds `features.outbox: true` to the manifest, and never adds the package.
- Someone adds the package and the `AddPlatformOutbox()` call, and never declares the feature — an
  undeclared capability, shipped.
- A feature is turned off in the manifest, but the package reference stays behind as dead weight nobody
  dares delete.
- The build regenerates `openapi.json` and nobody commits it, so the reviewed contract and the served
  contract have drifted apart.
- The manifest's `schemaVersion` moves to `2` and the tooling keeps interpreting it as `1`, guessing
  forward.

Individually, every artifact is valid. Together they lie. That is the failure mode specdrift exists to
catch, and it is the only thing it does.

## The inversion: LLMs call it

The obvious way to build this tool in 2026 would be to hand the manifest and the repository to a model
and ask "do these agree?" That tool would be non-deterministic, unauditable, expensive, and wrong in ways
nobody could reproduce.

specdrift inverts it. **It never calls an LLM — LLMs call it.**

Same inputs, byte-identical report. No network. No clocks in the output. An agent that just edited your
manifest can ask `spec_drift` whether the change was coherent and get an answer it can act on, not a
paragraph it has to interpret. Your CI gets the same answer, from the same binary, and the two can never
disagree.

## The engine is generic; the profile is yours

specdrift knows nothing about any particular platform, and that is deliberate. Three files ship in *your*
repository:

| File | What it declares |
|------|------------------|
| `manifest.schema.json` | The shape of your manifest |
| `rules.yaml` | Cross-field invariants a schema cannot express |
| `.specdrift/drift.yaml` | Which features imply which packages and wiring calls |

An engine that shipped its own rules would be a framework, and you would fight it. An engine that reads
your rules as data is a lint pass, and you own it.

## What it deliberately is not

**It is not a fixer.** Every finding is a report. specdrift never edits your code to make a report go
away, because a tool that silently rewrites a manifest to match a mistaken repository has inverted the
source of truth.

**It is not a compiler.** Drift detection is textual: it scans project files for package references and
source files for wiring calls. That is a documented boundary, not an accident — see
[Drift detection](/drift-detection/#what-textual-really-means) for exactly what that buys and what it
costs. Roslyn-grade certainty belongs in analyzers that run inside your compilation.

**It does not guess.** An unknown schema keyword is a hard failure, not a shrug. An unknown rules-file
version is a hard failure. A manifest whose `schemaVersion` the profile does not understand is a hard
failure. In a tool whose entire product is trust, guessing forward is the one unforgivable behavior.
