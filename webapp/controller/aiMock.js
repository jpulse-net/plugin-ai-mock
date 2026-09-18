/**
 * @name            jPulse Framework / Plugins / AI Mock / WebApp / Controller / AI Mock
 * @tagline         Deterministic mock provider
 * @description     Scripted onAiComplete — no network, no spend
 * @file            plugins/ai-mock/webapp/controller/aiMock.js
 * @version         1.0.5
 * @release         2026-09-17
 * @repository      https://github.com/jpulse-net/plugin-ai-mock
 * @author          Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @copyright       2026 Peter Thoeny, https://twiki.org & https://github.com/peterthoeny/
 * @license         BSL 1.1 -- see LICENSE file; for commercial use: team@jpulse.net
 * @genai           80%, Cursor 3.20, Grok 4.6
 */

const MODEL_ECHO = 'mock-echo';
const MODEL_UNPRICED = 'mock-unpriced';
const MODEL_VISION = 'mock-vision';

export function flattenContent(content) {
    if (typeof content === 'string') {
        return content;
    }
    if (!Array.isArray(content)) {
        return '';
    }
    return content.map((part) => {
        if (!part) {
            return '';
        }
        if (typeof part === 'string') {
            return part;
        }
        if (part.type === 'text') {
            return String(part.text || '');
        }
        return '';
    }).join('');
}

export function imageNamesFromContent(content) {
    if (!Array.isArray(content)) {
        return [];
    }
    return content.map((part) => {
        if (!part || part.type !== 'image') {
            return '';
        }
        return String(part.name || part.mimeType || 'image');
    }).filter(Boolean);
}

function lastUserImages(messages) {
    for (let i = (messages || []).length - 1; i >= 0; i--) {
        if (messages[i].role !== 'user') {
            continue;
        }
        const names = imageNamesFromContent(messages[i].content);
        if (names.length) {
            return names;
        }
    }
    return [];
}

function firstTextPart(content) {
    if (typeof content === 'string') {
        return content;
    }
    if (!Array.isArray(content)) {
        return '';
    }
    for (let i = 0; i < content.length; i++) {
        const part = content[i];
        if (typeof part === 'string' && part) {
            return part;
        }
        if (part && part.type === 'text' && part.text) {
            return String(part.text);
        }
    }
    return '';
}

function lastUserText(messages) {
    for (let i = (messages || []).length - 1; i >= 0; i--) {
        if (messages[i].role !== 'user') {
            continue;
        }
        return firstTextPart(messages[i].content) || flattenContent(messages[i].content);
    }
    return '';
}

export function getPath(value, dotted) {
    let current = value;
    for (const part of String(dotted || '').split('.')) {
        if (current == null || typeof current !== 'object') {
            return undefined;
        }
        current = current[part];
    }
    return current;
}

export function resolvePriorValue(value, prior) {
    if (typeof value === 'string' && value.startsWith('$prior.')) {
        const resolved = getPath(prior, value.slice(7));
        return resolved === undefined ? value : resolved;
    }
    if (Array.isArray(value)) {
        return value.map(item => resolvePriorValue(item, prior));
    }
    if (value && typeof value === 'object') {
        const next = {};
        for (const [key, item] of Object.entries(value)) {
            next[key] = resolvePriorValue(item, prior);
        }
        return next;
    }
    return value;
}

export function parseToolExtra(extra) {
    const text = String(extra || '');
    if (!text) {
        return { name: '', args: {} };
    }
    const colon = text.indexOf(':');
    if (colon < 0) {
        return { name: text, args: {} };
    }
    const name = text.slice(0, colon);
    let args = {};
    try {
        args = JSON.parse(text.slice(colon + 1));
    } catch {
        args = {};
    }
    return { name, args: args && typeof args === 'object' && !Array.isArray(args) ? args : {} };
}

export function priorFromRows(rows) {
    const row = rows && rows[0] ? rows[0] : {};
    if (row.result && row.result.data !== undefined) {
        return row.result.data;
    }
    if (row.data !== undefined) {
        return row.data;
    }
    if (row.result && typeof row.result === 'object') {
        return row.result;
    }
    return row;
}

export function lastToolResults(messages) {
    const list = messages || [];
    for (let i = list.length - 1; i >= 0; i--) {
        if (list[i].role === 'tool') {
            const rows = [];
            let start = i;
            while (start >= 0 && list[start].role === 'tool') {
                start -= 1;
            }
            for (let idx = start + 1; idx <= i; idx += 1) {
                const msg = list[idx];
                let parsed = msg.content;
                if (typeof parsed === 'string') {
                    try {
                        parsed = JSON.parse(parsed);
                    } catch {
                        parsed = { summary: parsed };
                    }
                }
                rows.push({
                    id: msg.toolCallId || msg.id,
                    name: msg.name,
                    ...(parsed && typeof parsed === 'object' ? parsed : {})
                });
            }
            return rows;
        }
        if (list[i].role !== 'user') {
            continue;
        }
        const content = flattenContent(list[i].content);
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) {
                return parsed;
            }
        } catch {
            return [];
        }
    }
    return [];
}

function parseScript(ctx) {
    if (ctx.script && typeof ctx.script === 'object') {
        return ctx.script;
    }
    if (typeof ctx.script === 'string') {
        return { type: ctx.script };
    }
    const text = lastUserText(ctx.messages);
    const match = text.match(/\[mock:([a-z]+)(?::([^\]]+))?\]/i);
    if (!match) {
        return { type: 'text', text: text || 'Mock reply.' };
    }
    return {
        type: match[1].toLowerCase(),
        extra: match[2] || '',
        text: text.replace(match[0], '').trim() || 'Mock reply.'
    };
}

function toolSteps(script) {
    if (Array.isArray(script.steps) && script.steps.length) {
        return script.steps;
    }
    if (script.name) {
        return [{ name: script.name, args: script.args || {} }];
    }
    const parsed = parseToolExtra(script.extra);
    if (parsed.name) {
        return [parsed];
    }
    return [];
}

function usage() {
    return { type: 'usage', tokensIn: 12, tokensOut: 8, cacheWrite: 0, cacheRead: 0 };
}

function waitForAbort(signal, fallbackMs) {
    return new Promise((resolve) => {
        if (signal?.aborted) {
            resolve();
            return;
        }
        const timer = setTimeout(resolve, Number.isFinite(fallbackMs) ? fallbackMs : 60000);
        if (!signal) {
            return;
        }
        signal.addEventListener('abort', () => {
            clearTimeout(timer);
            resolve();
        }, { once: true });
    });
}

class AiMockController {
    static hooks = {
        onAiProviderRegister: { handler: 'onAiProviderRegister' },
        onAiComplete: { handler: 'onAiComplete' }
    };

    static async onAiProviderRegister(ctx) {
        ctx.providers.push({
            plugin: 'ai-mock',
            label: 'Mock',
            models: [
                { id: MODEL_ECHO, label: 'Mock Echo' },
                { id: MODEL_UNPRICED, label: 'Mock Unpriced' },
                { id: MODEL_VISION, label: 'Mock Vision', capabilities: { vision: true } }
            ],
            capabilities: { vision: false },
            priceTable: {
                [MODEL_ECHO]: { input: 0, output: 0, cacheWrite: 0, cacheRead: 0 }
            },
            maxTokens: 4096,
            configured: true
        });
        return ctx;
    }

    static async onAiComplete(ctx) {
        const script = parseScript(ctx);
        const emit = ctx.emit;
        const toolNames = (ctx.tools || []).map(t => t.name);

        if (script.type === 'throw') {
            throw new Error('Mock provider threw');
        }

        if (script.type === 'fatal') {
            emit({ type: 'error', code: 'AI_MOCK_FATAL', message: 'Mock fatal error', retryable: false });
            return ctx;
        }

        if (script.type === 'retry' && (ctx.attempt || 0) === 0) {
            emit({ type: 'error', code: 'AI_MOCK_RETRY', message: 'Mock retryable error', retryable: true });
            return ctx;
        }

        if (script.type === 'truncated') {
            emit({ type: 'tool_use_truncated', name: toolNames[0] || 'unknown' });
            emit(usage());
            emit({ type: 'done', stopReason: 'length' });
            return ctx;
        }

        if (script.type === 'tool') {
            const steps = toolSteps(script);
            const round = ctx.round || 0;
            if (round < steps.length) {
                const priorRows = lastToolResults(ctx.messages);
                const prior = priorFromRows(priorRows);
                const step = steps[round] || {};
                const args = resolvePriorValue(step.args || {}, prior);
                const name = step.name || toolNames[0] || 'unknown';
                emit({
                    type: 'tool_use',
                    calls: [{ id: `call_${round + 1}`, name, args }]
                });
                emit(usage());
                emit({ type: 'done', stopReason: 'tool' });
                return ctx;
            }
            const priorRows = lastToolResults(ctx.messages);
            const summary = priorRows.map(row => row.summary || row.result?.summary || row.name).join('; ');
            emit({
                type: 'text_delta',
                text: script.text || `Used ${priorRows.map(row => row.name).join(', ') || 'tools'}. ${summary}`.trim()
            });
            emit(usage());
            emit({ type: 'done', stopReason: 'end' });
            return ctx;
        }

        if (script.type === 'tools' && (ctx.round || 0) === 0) {
            const first = toolNames[0] || 'tool_a';
            const second = toolNames[1] || toolNames[0] || 'tool_b';
            emit({
                type: 'tool_use',
                calls: [
                    { id: 'call_1', name: first, args: {} },
                    { id: 'call_2', name: second, args: {} }
                ]
            });
            emit(usage());
            emit({ type: 'done', stopReason: 'tool' });
            return ctx;
        }

        if (script.type === 'hang') {
            const wait = Number(script.extra) || 60000;
            await waitForAbort(ctx.abortSignal, wait);
            if (ctx.abortSignal?.aborted) {
                return ctx;
            }
            emit({ type: 'text_delta', text: '(hung until cancel)' });
            emit(usage());
            emit({ type: 'done', stopReason: 'end' });
            return ctx;
        }

        if (script.type === 'unpriced') {
            ctx.model = MODEL_UNPRICED;
            emit({ type: 'text_delta', text: script.text || 'Unpriced reply.' });
            emit(usage());
            emit({ type: 'done', stopReason: 'end' });
            return ctx;
        }

        if (script.type === 'slow') {
            const chunks = (script.text || 'Slow mock reply.').split(' ');
            for (const chunk of chunks) {
                if (ctx.abortSignal?.aborted) {
                    return ctx;
                }
                emit({ type: 'text_delta', text: `${chunk} ` });
                const wait = Number(script.extra) || 20;
                await new Promise(resolve => setTimeout(resolve, wait));
            }
            emit(usage());
            emit({ type: 'done', stopReason: 'end' });
            return ctx;
        }

        const images = lastUserImages(ctx.messages);
        if ((ctx.model === MODEL_VISION || script.type === 'vision') && images.length) {
            const seen = `I can see ${images.join(', ')}.`;
            emit({
                type: 'text_delta',
                text: script.type === 'vision' && script.text ? script.text : seen
            });
            emit(usage());
            emit({ type: 'done', stopReason: 'end' });
            return ctx;
        }

        const reply = script.text || 'Mock reply.';
        emit({ type: 'text_delta', text: reply });
        emit(usage());
        emit({ type: 'done', stopReason: 'end' });
        return ctx;
    }
}

export default AiMockController;

// EOF plugins/ai-mock/webapp/controller/aiMock.js
