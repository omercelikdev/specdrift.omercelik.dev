---
title: Getting started
description: Install specdrift, validate a manifest, and check a repository for drift.
---

specdrift is a .NET global tool. It needs the **.NET 10 SDK** to install, and nothing at runtime.

## Install

:::caution[Not yet on NuGet]
specdrift is at **0.4.0** and has not been published to nuget.org yet. `dotnet tool install -g specdrift`
will fail until it is. Build it from source in the meantime — it takes a few seconds.
:::

```bash
git clone https://github.com/qorpe/specdrift.git
cd specdrift

dotnet pack src/Specdrift -c Release -o ./nupkg
dotnet tool install -g specdrift --add-source ./nupkg
```

Once it is published, the install is the usual one line:

```bash
dotnet tool install -g specdrift
```

Verify:

```bash
specdrift --help
```

## 1. Validate a manifest

You need three files. **specdrift ships none of them** — the schema and the rules are profile data that
lives in your repository, because the engine knows nothing about your platform.

```yaml
# .platform/manifest.yaml
schemaVersion: 1
features:
  distributedCaching:
    levels: [l1, l2]
  outbox: true
```

```json
// manifest.schema.json
{
  "type": "object",
  "required": ["schemaVersion", "features"],
  "properties": {
    "schemaVersion": { "type": "integer", "const": 1 },
    "features": { "type": "object" }
  }
}
```

```yaml
# rules.yaml — cross-field invariants a schema cannot express
version: 1
rules:
  - id: SPEC0101
    description: L2 caching needs a redis connection name
    when: { path: features.distributedCaching.levels, op: contains, value: l2 }
    require: { path: features.distributedCaching.redis.connectionName }
    severity: error
    message: "features.distributedCaching.levels includes 'l2' but redis.connectionName is missing - name the connection the cache should use."
```

Run it:

```bash
specdrift validate .platform/manifest.yaml \
  --schema manifest.schema.json \
  --rules rules.yaml
```

```
ERROR SPEC0101 at features.distributedCaching.redis.connectionName: features.distributedCaching.levels includes 'l2' but redis.connectionName is missing - name the connection the cache should use.
```

Exit code `1`. Add the connection name and it becomes `specdrift: clean — no findings`, exit `0`.

## 2. Check for drift

Validation proves the manifest is *well-formed*. Drift proves the repository actually *does what the
manifest says*. It needs one more profile file:

```yaml
# .specdrift/drift.yaml
version: 1
manifest: .platform/manifest.yaml
schemaVersion: 1
wiring:
  - feature: features.outbox
    package: Platform.Messaging
    call: AddPlatformOutbox
openapi:
  - committed: specs/openapi.json
    built: artifacts/openapi.json
```

```bash
specdrift drift --repo .
```

```
ERROR SPEC0201 at features.outbox: the manifest enables this feature but no project references 'Platform.Messaging' — the app does not do what the manifest says
```

`--repo .` is the only required flag; the profile defaults to `.specdrift/drift.yaml` under it.

## 3. Let your agent ask

Register specdrift as an MCP server and a coding agent can call the same two verbs instead of guessing
whether its own change was coherent:

```json
{ "mcpServers": { "specdrift": { "command": "specdrift", "args": ["mcp"] } } }
```

See [MCP server](/mcp/).

## Next

- [Why specdrift](/why-specdrift/) — the gap it exists to watch.
- [Schema validation](/schema-validation/) — exactly which keywords the evaluator asserts.
- [Invariant rules](/invariant-rules/) — `require`, `forbid`, `deny`.
- [Drift detection](/drift-detection/) — every check and its finding id.
- [CI integration](/ci/) — the exit-code contract as a gate.
