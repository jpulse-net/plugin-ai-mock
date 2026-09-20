# jPulse Docs / Installed Plugins / AI Mock Provider Plugin v1.0.12

`ai-mock` is a deterministic provider for `ai-core`. It has no API key and does not call a language-model service. A turn against mock is the smoke test that an install worked. Use it in unit tests and local development. A commercial provider is a separate package (`@jpulse-net/plugin-ai-anthropic`). The mock always reports `configured: true`, so it stays on the menu when the allowed list is empty.

## Features

- **No API key, no spend** — enable `ai-core` and `ai-mock`, then send a turn.
- **Scripted completions** — prefix the user message with `[mock:name]`, or omit the prefix for a plain text reply.
- **Provider contract coverage** — text, parallel tool calls, truncated arguments, retryable and fatal errors, a slow stream, hang-until-cancel, a thrown provider, and an unpriced model.

## Setup

1. Install the bundle (`npx jpulse plugin install @jpulse-net/plugin-ai-core`) if it is not already present.
2. Both plugins have `autoEnable: true`. If they were already discovered while disabled, enable them under **Admin → Plugins** and restart.
3. On **Site Configuration → AI**, leave the default provider empty (the first registered provider is used) or set it to `ai-mock` / `mock-echo`.
4. Open `/hello-ai/` (Hello AI plugin) and send a message, or start a thread and a turn over HTTP:

```
POST /api/1/ai/thread          { "scopeType": "hello-ai", "scopeId": "demo" }
POST /api/1/ai/thread/:id/turn { "text": "[mock:text] Hello" }
```

The second call is Server-Sent Events unless a client-host tool is offered, in which case the panel uses the per-thread WebSocket.

## Scripts

| Marker | What it does |
|---|---|
| *(none)* or `[mock:text]` | One text reply — the rest of the message, or `Mock reply.` |
| `[mock:tools]` | First round: two tool calls in one `tool_use` array (the first two offered tools, or placeholders). Next round: text. |
| `[mock:truncated]` | `tool_use_truncated`, then `done` with `stopReason: length`. |
| `[mock:retry]` | Retryable error on attempt 0, then text. |
| `[mock:fatal]` | Non-retryable `AI_MOCK_FATAL`. |
| `[mock:slow]` | Streams words with a short delay (optional `:[ms]` after `slow`) for cancel and timeout tests. |
| `[mock:hang]` | Waits on the abort signal (optional `:[ms]` fallback). Cancel with `POST /api/1/ai/thread/:id/cancel`, not by closing the SSE connection. |
| `[mock:throw]` | Throws from the provider. The turn fails. |
| `[mock:unpriced]` | Replies on `mock-unpriced` (no price row) so recorded cost stays `null`. |
| `[mock:tool:<name>:<jsonArgs>]` | One `tool_use` for that name and arguments, then a text summary. |

The structured field `script: { type: 'tool', name, args }` is the same as the bracket form. A sequence is `script: { type: 'tool', steps: [ { name, args }, … ] }` — one call per round, then a summary. An argument whose value is `$prior.<dotted.path>` resolves against the previous round's first tool result; an unresolvable path is left as a literal.

The bracket form cannot carry a `]` inside the JSON (the marker ends there). Objects and scalars are fine; use the structured field for arrays.

Example: `[mock:tools] outline this document`

## Models

| Id | Label | Notes |
|---|---|---|
| `mock-echo` | Mock Echo | Token counts are fixed (12 in / 8 out); the price table is all zeros. `capabilities.vision` is false. |
| `mock-unpriced` | Mock Unpriced | Used by `[mock:unpriced]`. No price row, so cost is `null`. |

## Technical details

- **JavaScript**: `webapp/controller/aiMock.js` — handles `onAiProviderRegister` and `onAiComplete`.
- **Hooks**: defined by `ai-core` (`onAiProviderRegister` continue, `onAiComplete` abort). This plugin only handles them.
- **Depends on**: `ai-core` (`@jpulse-net/plugin-ai-core` >= 1.0.0). jPulse >= 2.0.5 (`jPulse.ws` queues a send until the socket is open).
- **Do not publish this directory.** Publish the bundle from `plugins/ai-core`.

## Plugin releases

- **1.0.12**, W-239, 2026-09-19: Version lockstep with `ai-core` 1.0.12. No product change.
- **1.0.11**, W-238, 2026-09-19: Version lockstep with `ai-core` 1.0.11. No product change.
- **1.0.10**, W-237, 2026-09-19: Version lockstep with `ai-core` 1.0.10. No product change.
- **1.0.9**, W-234, 2026-09-19: Version lockstep with `ai-core` 1.0.9. No product change.
- **1.0.8**, W-233, 2026-09-19: Version lockstep with `ai-core` 1.0.8. No product change.
- **1.0.7**, W-232, 2026-09-18: Version lockstep with `ai-core` 1.0.7. No product change.
- **1.0.6**, W-231, 2026-09-17: Version lockstep with `ai-core` 1.0.6. No product change.
- **1.0.5**, W-230, 2026-09-17: Version lockstep with `ai-core` 1.0.5. No product change.
- **1.0.4**, W-228, 2026-09-17: Mock Vision row — `capabilities.vision` on `mock-vision` so the send-time vision gate is demonstrable with no API key. Default reply is `I can see <file>.`
- **1.0.3**, W-227, 2026-09-17: Version lockstep with `ai-core` 1.0.3. No product change.
- **1.0.2**, W-226, 2026-09-17: Targeted `[mock:tool:…]` script and structured `steps` with `$prior.<path>`.
- **1.0.1**, W-224, 2026-09-17: Descriptor sets `configured: true` so mock stays on an empty allowed list when a keyless commercial provider is omitted.
- **1.0.0**, W-223, 2026-09-17: First release, bundled with `ai-core`.
