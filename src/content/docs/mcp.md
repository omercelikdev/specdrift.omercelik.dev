---
title: MCP server
description: spec_validate and spec_drift over stdio — so coding agents ask the engine instead of guessing.
---

An agent that just edited your manifest has no way to know whether the edit was coherent. It can read the
repository and form an opinion, which is exactly the non-deterministic guess specdrift exists to replace.

So specdrift serves the same two verbs over the Model Context Protocol.

```bash
specdrift mcp
```

## Register it

Like any stdio MCP server:

```json
{
  "mcpServers": {
    "SpecDrift": {
      "command": "SpecDrift",
      "args": ["mcp"]
    }
  }
}
```

That is the whole configuration. The server takes no flags, needs no port, and opens no socket.

## The tools

### `spec_validate`

Validate a manifest against a schema and, optionally, invariant rules.

| Parameter | Required | Meaning |
|-----------|----------|---------|
| `manifestPath` | yes | Path to the manifest (YAML or JSON) |
| `schemaPath` | yes | Path to the JSON schema |
| `rulesPath` | no | Path to the invariant rules YAML |

### `spec_drift`

Detect manifest-versus-repository drift.

| Parameter | Required | Meaning |
|-----------|----------|---------|
| `repoRoot` | yes | Repository root to inspect |
| `profilePath` | no | Defaults to `<repoRoot>/.specdrift/drift.yaml` |

## What comes back

Both tools return the CLI's `--format json` payload verbatim — an array of findings, empty when clean:

```json
[
  {
    "ruleId": "SPEC0202",
    "severity": "error",
    "path": "features.outbox",
    "message": "the manifest enables this feature but 'AddPlatformOutbox' is called nowhere — referenced, not wired"
  }
]
```

An agent gets a fact it can act on — a path, a severity, and a sentence naming the fix — rather than a
paragraph it has to interpret. And because the answer is deterministic, the agent, the reviewer and CI all
see the same one.

## The tools are thin on purpose

`spec_validate` and `spec_drift` are adapters. Every semantic lives in the engines the CLI calls, so there
is exactly one implementation of "what counts as drift" and no way for the MCP surface to disagree with
the command line. A finding an agent sees is a finding your build will fail on.

## Implementation notes

**The server owns stdio.** MCP speaks JSON-RPC over stdin/stdout, so anything else written there corrupts
the protocol. specdrift clears every logging provider before the host starts. If you extend it, log to
stderr or not at all.

**No network, no clocks.** The same [determinism contract](/determinism/) the CLI honors applies here.
An agent can call `spec_drift` twice and reason about the diff, because an unchanged repository cannot
produce a changed report.

**It never calls a model.** The tool an LLM calls is not, itself, allowed to call an LLM. That is the whole
inversion — see [Why SpecDrift](/why-specdrift/#the-inversion-llms-call-it).
