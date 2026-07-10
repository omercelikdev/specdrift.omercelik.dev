---
title: CLI reference
description: Every verb, flag, exit code and output format.
---

```
specdrift — deterministic spec lint for manifest-driven golden paths

usage:
  specdrift validate <manifest.(yaml|yml|json)> --schema <schema.json> [--rules <rules.yaml>] [--format text|json]
  specdrift drift --repo <dir> [--profile <drift.yaml>] [--format text|json]
  specdrift mcp
```

The argument parser is hand-written on purpose: one dependency fewer to audit, and the exit-code contract
stays visible in a single file.

## Exit codes

The exit code **is** the contract. Everything else is presentation.

| Code | Meaning |
|------|---------|
| `0` | Clean, or warnings only |
| `1` | At least one **error** finding |
| `2` | Usage error, unreadable file, or malformed schema/rules/profile |

Warnings never gate. A `2` is never a finding about your manifest — it means specdrift could not do its
job at all, which is a different problem and deserves a different reaction in CI.

## `specdrift validate`

```bash
specdrift validate .platform/manifest.yaml --schema manifest.schema.json --rules rules.yaml
```

| Flag | Required | Meaning |
|------|----------|---------|
| *(positional)* | yes | The manifest — `.yaml`, `.yml` or `.json` |
| `--schema` | yes | JSON Schema for the manifest's shape |
| `--rules` | no | Cross-field invariants ([Invariant rules](/invariant-rules/)) |
| `--format` | no | `text` (default) or `json` |

Runs [schema validation](/schema-validation/) first, then the rules, and reports both in one pass.

## `specdrift drift`

```bash
specdrift drift --repo . --format json
```

| Flag | Required | Meaning |
|------|----------|---------|
| `--repo` | yes | Repository root to inspect |
| `--profile` | no | Drift profile; defaults to `<repo>/.specdrift/drift.yaml` |
| `--format` | no | `text` (default) or `json` |

See [Drift detection](/drift-detection/) for every check and finding id.

## `specdrift mcp`

Starts a stdio MCP server exposing `spec_validate` and `spec_drift`. It takes no flags — it owns stdin
and stdout, and all logging is suppressed so nothing can corrupt the protocol stream. See
[MCP server](/mcp/).

## Output

### `--format text`

One line per finding, in a stable order:

```
ERROR SPEC0201 at features.outbox: the manifest enables this feature but no project references 'Platform.Messaging' — the app does not do what the manifest says
WARN  SPEC0203 at features.tracing: 'Platform.Tracing' is referenced but the manifest does not enable this feature — dead weight, or an undeclared capability
```

A clean run prints exactly `specdrift: clean — no findings`.

### `--format json`

An array — empty when clean, so a consumer never has to special-case success:

```json
[
  {
    "ruleId": "SPEC0201",
    "severity": "error",
    "path": "features.outbox",
    "message": "the manifest enables this feature but no project references 'Platform.Messaging' — the app does not do what the manifest says"
  }
]
```

The four fields are the whole schema. `severity` is `"error"` or `"warning"`; `path` is dotted for rule
and drift findings, and a JSON-pointer-style `#/a/b` for schema findings.

## Finding ids

| Id | Verb | Severity | Meaning |
|----|------|----------|---------|
| `SPEC0001` | validate | error | A schema assertion failed (the keyword is named in the message) |
| *(yours)* | validate | yours | Whatever id your `rules.yaml` declares — `SPEC0101` in the examples |
| `SPEC0200` | drift | error | The manifest the profile points at does not exist |
| `SPEC0201` | drift | error | Feature enabled, package not referenced |
| `SPEC0202` | drift | error | Feature enabled, wiring call absent — referenced, not wired |
| `SPEC0203` | drift | warning | Package referenced, feature not enabled — dead weight |
| `SPEC0211` | drift | error | Built document exists, nothing committed |
| `SPEC0212` | drift | error | Committed document no longer matches the built one |
| `SPEC0213` | drift | warning | Built document missing — run the export first |
| `SPEC0221` | drift | error | Manifest `schemaVersion` differs from the profile's |

Rule ids in `rules.yaml` are entirely yours. specdrift never invents one, and never renumbers yours.
