---
title: Invariant rules
description: Cross-field invariants declared as data — when a condition holds, require, forbid, or deny another path.
---

A JSON Schema describes one member at a time. It cannot say *"if L2 caching is on, a Redis connection name
must exist."* That relationship is where manifests actually go wrong, so specdrift lets you declare it as
data.

```bash
specdrift validate manifest.yaml --schema manifest.schema.json --rules rules.yaml
```

## The shape

```yaml
version: 1
rules:
  - id: SPEC0101
    description: L2 caching needs a redis connection name
    when: { path: features.distributedCaching.levels, op: contains, value: l2 }
    require: { path: features.distributedCaching.redis.connectionName }
    severity: error
    message: "features.distributedCaching.levels includes 'l2' but redis.connectionName is missing - name the connection the cache should use."
```

| Field | Required | Meaning |
|-------|----------|---------|
| `id` | yes | Yours. specdrift never invents or renumbers one |
| `description` | no | For humans reading the rules file |
| `when` | no | The guard. Omit it and the rule applies unconditionally |
| `require` / `forbid` / `deny` | **exactly one** | The constraint |
| `severity` | no | `error` (default) or `warning` |
| `message` | yes | Must teach the fix |

`version: 1` is mandatory, and an unrecognized version is a hard failure — the engine never guesses
forward.

## The guard: `when`

| `op` | Holds when |
|------|-----------|
| `exists` | The path resolves to something present and non-empty *(the default if `op` is omitted)* |
| `equals` | The value at the path equals `value` |
| `contains` | The array at the path contains `value`, **or** the string at the path contains it as a substring |

Paths are dotted: `features.distributedCaching.levels`. They walk object members only — there is no array
indexing.

"Absent or empty" means: missing, `null`, the empty string, or an empty array. An explicit `false` is
**not** empty; it is a value.

## The constraint

Exactly one of the three. A rule declaring two, or none, is a hard failure when the file loads — you find
out immediately, not on the one manifest that happens to trip it.

### `require` — the path must exist and be non-empty

```yaml
- id: SPEC0101
  when: { path: features.distributedCaching.levels, op: contains, value: l2 }
  require: { path: features.distributedCaching.redis.connectionName }
  message: "L2 caching is on but no Redis connection is named - name the connection the cache should use."
```

### `forbid` — the path must be absent

```yaml
- id: SPEC0102
  description: an in-memory cache has no connection to name
  when: { path: features.distributedCaching.levels, op: equals, value: l1 }
  forbid: { path: features.distributedCaching.redis }
  severity: warning
  message: "Only L1 caching is enabled, so the redis block is dead configuration - delete it."
```

### `deny` — the path must not equal a specific value

```yaml
- id: SPEC0103
  description: the outbox needs a real broker
  when: { path: features.outbox, op: exists }
  deny: { path: providers.broker, value: none }
  message: "features.outbox is enabled but providers.broker is 'none' - choose a broker the outbox can publish to."
```

`deny` is the one you reach for when a value is *present and valid in isolation* but wrong in context.
`forbid` says "this must not be here"; `deny` says "this must not be **that**."

## Unconditional rules

Drop `when` and the constraint always applies:

```yaml
- id: SPEC0110
  require: { path: metadata.owner }
  message: "Every manifest must name an owning team in metadata.owner - an unowned golden path rots."
```

## Messages must teach the fix

specdrift refuses to load a rule with no `message`. This is not a formality.

A finding that says `SPEC0101 violated` costs the reader a trip to the rules file, then to the schema,
then to the code. A finding that says *"L2 caching is on but no Redis connection is named — name the
connection the cache should use"* costs them nothing. Same rule, same evaluation; the difference is
entirely in what you wrote.

Write the message for the person who has never seen the rule, because that is always who reads it.

## Evaluation order

Rules run top to bottom, in declaration order, and findings come back in that order. The report is
byte-identical across runs and across machines — see [the determinism contract](/determinism/).

Rules never interact. There is no rule that disables another, no precedence, no first-match-wins. Each
one is evaluated against the manifest independently, which is what makes the file readable a year later.
