---
title: Drift detection
description: Manifest against repository reality — wiring in both directions, contract divergence, and schema-version skew.
---

`validate` proves the manifest is well-formed. `drift` proves the repository actually *does what the
manifest says*.

```bash
specdrift drift --repo .
```

The profile defaults to `<repo>/.specdrift/drift.yaml`, or pass `--profile`.

## The profile

Like the schema and the rules, this is **your data**. specdrift ships no wiring table for any platform.

```yaml
# .specdrift/drift.yaml
version: 1
manifest: .platform/manifest.yaml
schemaVersion: 1

wiring:
  - feature: features.outbox
    package: Platform.Messaging
    call: AddPlatformOutbox

  - feature: providers.auth        # value-gated: enabled only for these values
    in: [openid, apikey]
    package: Platform.Auth
    call: AddPlatformAuth

openapi:
  - committed: specs/openapi.json
    built: artifacts/openapi.json
```

`version` and `manifest` are required. `schemaVersion`, `wiring` and `openapi` are each optional — a
profile with only an `openapi` block is a perfectly good profile.

## Wiring, checked in both directions

Every wiring rule needs a `feature` and at least one of `package` / `call`. The interesting part is that
drift is checked *both ways*.

| When | Finding | Severity |
|------|---------|----------|
| Feature enabled, package not referenced | `SPEC0201` — the app does not do what the manifest says | error |
| Feature enabled, call absent | `SPEC0202` — referenced, not wired | error |
| Feature **not** enabled, package referenced | `SPEC0203` — dead weight, or an undeclared capability | warning |

That third row is the one other tools miss. A package sitting in a `.csproj` that no feature declares is
either cruft nobody dared delete, or a capability shipping without ever being written down. Both are worth
a line in the report; neither is worth failing the build, so it is a warning.

### When is a feature "enabled"?

**Without `in` or `equals`:** the path exists, is non-empty, and is not the literal `false`. So
`outbox: true` is enabled, `outbox: false` is not, and an absent `outbox` is not.

**With `equals: openid`:** enabled only when the value is exactly `openid`.

**With `in: [openid, apikey]`:** enabled for any listed value. Reach for this on multi-strategy
providers — a single-value `equals` reports false dead weight the moment someone picks the other strategy.

## What "textual" really means

This is a documented boundary, not an oversight. specdrift scans:

- every `*.csproj` for the literal `"Platform.Messaging"` — the quoted form an `Include=` attribute uses;
- every `*.cs` for the substring `AddPlatformOutbox`.

`bin/`, `obj/` and `.git/` are never scanned, and files are read in a stable order so the report is
byte-identical run to run.

:::caution[Know what a textual match costs you]
The scan cannot tell code apart from the places code merely appears.

- A wiring call named in a **test file**, a comment, or a string literal counts as wired.
- The match is a **substring**: a rule for `AddPlatformAuth` is satisfied by `AddPlatformAuthorization`.

Name your wiring calls distinctly, and read a clean `drift` report as *"nothing obviously diverged"* — not
as a proof of correctness. Roslyn-grade certainty belongs in analyzers that run inside your compilation.
:::

The trade is deliberate: this scan is cheap enough to run on every commit, and it catches the failures
that actually happen — a feature flipped on with nothing behind it.

## Contract divergence

For each `openapi` pair, the committed document is compared to the built one **semantically** — the JSON
trees are compared, so reformatting or key reordering is not drift.

| When | Finding | Severity |
|------|---------|----------|
| Built document missing | `SPEC0213` — run the build export first | warning |
| Built exists, nothing committed | `SPEC0211` — commit the contract so reviews can see it change | error |
| Both exist, trees differ | `SPEC0212` — the contract drifted; re-export and review the diff | error |

:::note
`SPEC0213` is a **warning**, so a missing built document does not fail the run. That is right when a
developer checks drift before building — but it means a CI job that forgets to export the OpenAPI document
will pass. Export before you check. See [CI integration](/ci/).
:::

## Schema-version skew

If the profile declares `schemaVersion: 1` and the manifest declares anything else, that is `SPEC0221`, an
error:

```
ERROR SPEC0221 at schemaVersion: manifest declares schemaVersion 2 but this profile understands 1
  — align them, never guess forward
```

The manifest moved and the tooling did not. Rather than interpret a version it was never taught, SpecDrift
stops. This is the same instinct as the hard fail on an unknown schema keyword: forward-guessing is the one
behavior a trust tool cannot afford.

## Missing manifest

If the profile points at a manifest that does not exist, you get one finding — `SPEC0200`, an error — and
nothing else runs. There is nothing to compare the repository against, and a list of downstream findings
derived from a missing file would be noise.

## Reports, never auto-fixes

specdrift prints what diverged and where. It never edits your manifest or your code.

A tool that "fixes" drift has to decide which side was right. Rewriting the manifest to match the
repository inverts the single source of truth — the exact property the golden path exists to hold. That
decision is yours, every time.
