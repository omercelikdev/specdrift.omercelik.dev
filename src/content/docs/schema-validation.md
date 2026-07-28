---
title: Schema validation
description: The in-tree JSON-Schema 2020-12 subset evaluator — which keywords assert, which annotate, and why an unknown keyword is a hard fail.
---

`specdrift validate` checks your manifest's shape against a JSON Schema before it looks at anything else.

```bash
specdrift validate .platform/manifest.yaml --schema manifest.schema.json
```

## Supported assertions

The evaluator implements the pragmatic 2020-12 subset that manifests actually use:

```
type · enum · const · required · properties · additionalProperties · unevaluatedProperties
oneOf · anyOf · allOf · not · if / then / else · $ref (internal)
pattern · minLength · maxLength · minimum · maximum
items · uniqueItems · minItems · maxItems
```

## An unknown keyword is a hard fail

This is the load-bearing decision. If your schema uses a keyword the evaluator does not implement —
`multipleOf`, `patternProperties`, `dependentRequired`, `exclusiveMinimum` — specdrift **refuses to run**:

```
SpecDrift: Schema keyword 'multipleOf' is not understood by this engine — never guess.
Supported assertions: $ref, additionalProperties, allOf, anyOf, const, ...
```

Exit code `2`. Not a finding, not a warning, not a silent skip.

A validator that quietly ignores the keyword it does not know will report *clean* on a manifest that
violates it. In a tool whose entire product is trust, that is worse than not running at all.

## Annotations are accepted, never asserted

These keywords are recognized and carried through, but they assert nothing:

```
$schema · $id · title · description · default · examples · deprecated
readOnly · writeOnly · $comment · format · $defs · definitions
```

:::caution[`format` does not validate]
`format` is an annotation, exactly as the 2020-12 specification defines it by default. A schema saying
`{ "type": "string", "format": "uri" }` will accept the string `demo` without complaint. If a value's
shape matters, assert it with `pattern`.
:::

## Reports are noise-free by design

A naive evaluator drowns you: one failed `oneOf` yields a finding for every alternative that did not
match, and a failed `if` yields findings for the branch that was never meant to apply.

specdrift prunes both.

- **A failed `if` merely deselects its branch.** No finding. That is what `if` is *for*.
- **A failed `oneOf` yields exactly one finding**, at the decision point:
  `value matches 0 of 3 alternatives (exactly one required)`. The alternatives' internal failures are
  noise — you are choosing a branch, not failing three schemas.
- A `oneOf` that matches exactly one branch then descends into it, so annotations still count.

The result is a report where every line is a thing you have to fix.

## `$ref`

Only internal references resolve: `#/$defs/feature`, `#/properties/features`. An external or remote `$ref`
is a hard failure — resolving it would mean touching the network, and specdrift never does.

Sibling keywords next to a `$ref` are ignored. 2020-12 permits them; manifests do not use them, and the
simpler model is worth more than the completeness.

## `unevaluatedProperties`

Implemented properly, which is the reason the evaluator exists in the first place. The set of *evaluated*
members is tracked across the in-place applicators — `allOf`, the matching `oneOf` / `anyOf` branches, the
selected `if` branch, and `$ref` — so this behaves the way you expect:

```json
{
  "allOf": [{ "properties": { "kind": { "type": "string" } } }],
  "properties": { "name": { "type": "string" } },
  "unevaluatedProperties": false
}
```

`kind` is evaluated by the `allOf` branch and `name` by the local `properties`; anything else is reported.

## Why an in-tree evaluator

Not because writing one is fun. Every candidate library failed this project's own gates:

- one ships a **maintenance-fee EULA** in its NuGet binaries, which the license gate rejects;
- one **compiles code at runtime**, which is the wrong shape for a CLI that must start in milliseconds;
- one **silently skips `if` / `then`**, which is the exact failure mode this tool exists to prevent.

So the evaluator is in-tree, dependency-free, and about four hundred lines you can read in one sitting.

## YAML and JSON validate identically

Manifests are converted to a JSON tree with YAML 1.2 core-schema scalar inference before evaluation, so a
`.yaml` and a `.json` manifest of the same content produce the same report.

One rule deserves attention because it is deliberate and it will eventually surprise someone:

```yaml
schemaVersion: 1        # integer
schemaVersion: "1"      # string — quoted scalars stay strings, always
enabled: true           # boolean
enabled: "true"         # string
```

A quoted scalar is a string. It is never coerced back to the type it looks like. If your schema says
`{ "type": "integer" }` and your manifest says `"1"`, you get a finding — which is the point.
