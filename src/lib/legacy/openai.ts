/**
 * Legacy Letter AI — OpenAI Client Wrapper
 *
 * Handles all AI generation calls with error handling and logging.
 */
import OpenAI from 'openai';
import {
    PREVIEW_SYSTEM_PROMPT,
    LETTER_SYSTEM_PROMPT,
    PROTOCOL_SYSTEM_PROMPT,
    SNIPPET_SYSTEM_PROMPT,
    buildPreviewUserPrompt,
    buildLetterUserPrompt,
    buildProtocolUserPrompt,
    buildSnippetUserPrompt,
} from './prompts';

function getClient(): OpenAI {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('[legacy/openai] OPENAI_API_KEY is not set');
    return new OpenAI({ apiKey });
}

/** Generate the 2-sentence preview teaser (free, pre-payment) */
export async function generatePreview(inputs: {
    firstName: string;
    challenge: string;
    dream: string;
}): Promise<string> {
    const client = getClient();
    const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: PREVIEW_SYSTEM_PROMPT },
            { role: 'user', content: buildPreviewUserPrompt(inputs) },
        ],
        max_tokens: 150,
        temperature: 0.85,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) throw new Error('[legacy/openai] Empty preview response');
    return text;
}

/** Generate the full 600-word Legacy Letter (post-payment) */
export async function generateLetter(inputs: {
    firstName: string;
    challenge: string;
    dream: string;
    legacyWish: string;
    builtFor: string;
    stopWorrying?: string;
}): Promise<string> {
    const client = getClient();
    const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: LETTER_SYSTEM_PROMPT },
            { role: 'user', content: buildLetterUserPrompt(inputs) },
        ],
        max_tokens: 1200,
        temperature: 0.82,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) throw new Error('[legacy/openai] Empty letter response');
    return text;
}

/** Generate the 90-day Legacy Builder Protocol (post-payment, $27 tier) */
export async function generateProtocol(inputs: {
    firstName: string;
    challenge: string;
    dream: string;
    legacyWish: string;
    builtFor: string;
    stopWorrying?: string;
}): Promise<string> {
    const client = getClient();
    const response = await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [
            { role: 'system', content: PROTOCOL_SYSTEM_PROMPT },
            { role: 'user', content: buildProtocolUserPrompt(inputs) },
        ],
        max_tokens: 2500,
        temperature: 0.75,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) throw new Error('[legacy/openai] Empty protocol response');
    return text;
}

/** Extract the single most shareable line from a letter */
export async function extractSnippet(letterText: string): Promise<string> {
    const client = getClient();
    const response = await client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
            { role: 'system', content: SNIPPET_SYSTEM_PROMPT },
            { role: 'user', content: buildSnippetUserPrompt(letterText) },
        ],
        max_tokens: 60,
        temperature: 0.5,
    });

    const text = response.choices[0]?.message?.content?.trim();
    if (!text) throw new Error('[legacy/openai] Empty snippet response');
    return text;
}
