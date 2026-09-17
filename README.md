# jPulse Framework / Plugins / AI Mock Provider Plugin v1.0.2

Deterministic provider for `ai-core`. No network, no API key, no spend. If a turn against mock works, the install worked.

Requires jPulse Framework >= 2.0.3. Depends on `ai-core` (same package, `@jpulse-net/plugin-ai-core`).

`autoEnable` is true. Same `npmPackage` as the primary (`@jpulse-net/plugin-ai-core`). No `webapp/bump-version.conf`. Its `package.json` is a publish guard only — `npm publish` here fails and names `ai-core`, and staging strips the file, so the published bundle has no `plugins/ai-mock/package.json`.

Do not publish this directory. Publish the bundle from `plugins/ai-core`.

## Scripts

Prefix a user message to pick a completion:

| Marker | Result |
|---|---|
| *(none)* or `[mock:text]` | One text reply |
| `[mock:tools]` | Two tool calls in one `tool_use` array, then text |
| `[mock:truncated]` | `tool_use_truncated` |
| `[mock:retry]` | Retryable error, then text |
| `[mock:fatal]` | Fatal error |
| `[mock:slow]` | Slow stream for cancel and timeout tests |
| `[mock:hang]` | Waits until the turn is canceled (or an optional `:[ms]` elapses) |
| `[mock:throw]` | Throws from the provider |
| `[mock:unpriced]` | Text reply on `mock-unpriced` so cost stays unknown |
| `[mock:tool:<name>:<jsonArgs>]` | One `tool_use` for that name and arguments, then a text summary |

The structured field `script: { type: 'tool', name, args }` is the same as the bracket form. A sequence is `script: { type: 'tool', steps: [ { name, args }, … ] }` — one call per round, then a summary. An argument whose value is `$prior.<dotted.path>` resolves against the previous round's first tool result; an unresolvable path is left as a literal.

The bracket form cannot carry a `]` inside the JSON (the marker ends there). Objects and scalars are fine; use the structured field for arrays.

## Plugin releases

- 1.0.2: Targeted `[mock:tool:…]` script and structured `steps` with `$prior.<path>`.
- 1.0.1: Descriptor sets `configured: true` so mock stays on an empty allowed list when a keyless commercial provider is omitted.
- 1.0.0: First release, bundled with `ai-core`.
