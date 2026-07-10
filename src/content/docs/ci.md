---
title: CI integration
description: Wire the exit-code contract into a build, and export your contracts before you check them.
---

specdrift needs no plugin and no reporter. The exit code is the gate.

| Code | CI should |
|------|-----------|
| `0` | Pass. Clean, or warnings only |
| `1` | **Fail.** At least one error finding |
| `2` | **Fail loudly.** specdrift could not run — bad flag, unreadable file, unknown schema keyword |

Treat `2` differently from `1` if you can. A `1` means your manifest is wrong; a `2` means your *tooling*
is wrong, and the manifest was never actually checked.

## GitHub Actions

```yaml
name: spec
on: [push, pull_request]

jobs:
  spec:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-dotnet@v4
        with:
          dotnet-version: 10.0.x

      - name: install specdrift
        run: dotnet tool install -g specdrift

      - name: validate the manifest
        run: |
          specdrift validate .platform/manifest.yaml \
            --schema .platform/manifest.schema.json \
            --rules .platform/rules.yaml

      # Export the built contract BEFORE checking drift against it.
      - name: export the openapi document
        run: dotnet run --project src/Api -- --export-openapi artifacts/openapi.json

      - name: check for drift
        run: specdrift drift --repo .
```

:::caution[Export before you check]
A missing built document is `SPEC0213`, a **warning** — so a job that forgets the export step reports clean
and passes. That is the one way this gate lies to you. Make the export a step, not an assumption.
:::

## Two verbs, two steps

Run them separately even though both exit non-zero on failure. A developer reading a red build should be
able to tell "the manifest is malformed" from "the code and the manifest disagree" at a glance, without
opening the log.

## Machine-readable output

`--format json` prints an array of findings — empty when clean, so nothing has to special-case success:

```bash
specdrift drift --repo . --format json > drift.json
```

Every finding has `ruleId`, `severity`, `path` and `message`. Feed it to a report annotator, a dashboard,
or an agent. Note that the exit code still carries the verdict; the JSON is a description of it.

## Pre-commit

The same two commands, one hook. `validate` is fast enough to be unnoticeable. `drift` reads every
`.csproj` and `.cs` in the repository, so on a large tree prefer it as a push hook or a CI step rather
than something that runs on every commit.

## What specdrift gates in its own repository

The tool is built behind the gates it argues for, from the first commit:

- **A license allowlist** over the entire dependency graph. Every transitive package must carry an
  allowlisted OSS license expression, checked after restore. This is why the schema evaluator is in-tree:
  the obvious library ships a maintenance-fee EULA in its binaries and the gate rejects it.
- **A Stryker mutation gate**, breaking under 70%. Line coverage proves a test ran; mutation coverage
  proves it would have noticed.
- **CI on every push and pull request**, running build, tests, and both gates.

A tool that asks you to trust its findings should be able to show why.
