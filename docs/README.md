# jPulse Docs / Installed Plugins / AI Mock Provider Plugin v1.0.0

`ai-mock` is a deterministic provider for `ai-core`. It has no API key and does not call a language-model service. A turn against mock is the smoke test that an install worked. Use it in unit tests and local development. A commercial provider is a separate package (`ai-anthropic` in a later item).

## Features

- **No API key, no spend** — enable `ai-core` and `ai-mock`, then send a turn.
- **Scripted completions** — prefix the user message with `[mock:name]`, or omit the prefix for a plain text reply.
- **Provider contract coverage** — text, parallel tool calls, truncated arguments, retryable and fatal errors, a slow stream, hang-until-cancel, a thrown provider, and an unpriced model.

## Setup

1. Install the bundle (`npx jpulse plugin install @jpulse-net/plugin-ai`) if it is not already present.
2. Both plugins have `autoEnable: true`. If they were already discovered while disabled, enable them under **Admin → Plugins** and restart.
3. On **Site Configuration → AI**, leave the default provider empty (the first registered provider is used) or set it to `ai-mock` / `mock-echo`.
4. Start a thread and a turn. The chat panel is not in this release — use HTTP:

```
POST /api/1/ai/thread          { "scopeType": "doc", "scopeId": "demo" }
POST /api/1/ai/thread/:id/turn { "text": "[mock:text] Hello" }
```

The second call is Server-Sent Events.

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

Example: `[mock:tools] outline this document`

Client-host tools are not executed in this release. A site that registers only server-host tools is enough to exercise `[mock:tools]`.

## Models

| Id | Label | Notes |
|---|---|---|
| `mock-echo` | Mock Echo | Token counts are fixed (12 in / 8 out); the price table is all zeros. `capabilities.vision` is false. |
| `mock-unpriced` | Mock Unpriced | Used by `[mock:unpriced]`. No price row, so cost is `null`. |

## Technical details

- **JavaScript**: `webapp/controller/aiMock.js` — handles `onAiProviderRegister` and `onAiComplete`.
- **Hooks**: defined by `ai-core` (`onAiProviderRegister` continue, `onAiComplete` abort). This plugin only handles them.
- **Depends on**: `ai-core` (`@jpulse-net/plugin-ai` >= 1.0.0). jPulse >= 2.0.2 (plugin translation merge).
- **Do not publish this directory.** Publish the bundle from `plugins/ai-core`.
