// The only file in scripts/robot/ that talks to a language model.
//
// Lane 2 uses a model to read a saved article and propose facts. Nothing the
// model says is trusted. Every sentence that reaches a page has to survive the
// code checks in extract.mjs and entities.mjs, which compare it against the
// saved raw text character by character. This file is plumbing, not judgement.
//
// Four providers, picked by which key is in the environment, in this order:
//   1. GEMINI_API_KEY     Google Gemini, OpenAI compatible endpoint. The default.
//   2. ANTHROPIC_API_KEY  Anthropic Messages API.
//   3. OPENROUTER_API_KEY OpenRouter, one key in front of many models.
//   4. GITHUB_TOKEN       GitHub Models, only when ROBOT_AI=github.
//
// Three of the four speak the OpenAI chat shape, so the table below carries the
// only things that differ: the endpoint, the headers and the default models.
//
// ROBOT_MODEL_EXTRACT and ROBOT_MODEL_WRITE override the model for whichever
// provider is in use. A key is never printed, logged or put in an error.

const TIMEOUT_MS = 120000
const RATE_LIMIT_WAIT_MS = 30000

export const NO_KEY_MESSAGE = 'lane 2: no AI key configured (set GEMINI_API_KEY), skipping'

const env = (name) => {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

const bearer = (key) => ({ authorization: `Bearer ${key}` })

// Order is the pick order. The first row whose key exists, and whose opt in is
// satisfied, wins.
const PROVIDERS = [
  {
    id: 'gemini',
    label: 'Google Gemini (free tier)',
    keyName: 'GEMINI_API_KEY',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    style: 'openai',
    headers: bearer,
    extract: 'gemini-2.5-flash',
    write: 'gemini-2.5-flash',
  },
  {
    id: 'anthropic',
    label: 'Anthropic Messages API',
    keyName: 'ANTHROPIC_API_KEY',
    url: 'https://api.anthropic.com/v1/messages',
    style: 'anthropic',
    headers: (key) => ({ 'x-api-key': key, 'anthropic-version': '2023-06-01' }),
    extract: 'claude-sonnet-5',
    write: 'claude-opus-5',
  },
  {
    id: 'openrouter',
    label: 'OpenRouter',
    keyName: 'OPENROUTER_API_KEY',
    url: 'https://openrouter.ai/api/v1/chat/completions',
    style: 'openai',
    // OpenRouter asks for the calling site so a key can be traced back to the
    // project using it. Neither header carries anything secret.
    headers: (key) => ({
      ...bearer(key),
      'HTTP-Referer': 'https://gta6record.com',
      'X-Title': 'gta6record robot',
    }),
    extract: 'google/gemini-2.5-flash',
    write: 'google/gemini-2.5-flash',
  },
  {
    id: 'github',
    label: 'GitHub Models',
    keyName: 'GITHUB_TOKEN',
    // GITHUB_TOKEN exists in every Actions run, so this row is opt in only.
    optIn: () => env('ROBOT_AI') === 'github',
    url: 'https://models.github.ai/inference/chat/completions',
    style: 'openai',
    headers: bearer,
    extract: 'openai/gpt-4.1-mini',
    write: 'openai/gpt-4.1-mini',
  },
]

function pickProvider() {
  for (const row of PROVIDERS) {
    const key = env(row.keyName)
    if (!key) continue
    if (row.optIn && !row.optIn()) continue
    return { ...row, key }
  }
  return null
}

export const provider = pickProvider()
export const hasKey = Boolean(provider)

let announced = false

/** Every lane 2 script starts with this. Returns false when there is no key. */
export function ready() {
  if (!provider) {
    console.log(NO_KEY_MESSAGE)
    return false
  }
  if (!announced) {
    console.log(`lane 2: using ${provider.label}`)
    announced = true
  }
  return true
}

export const modelFor = (job) =>
  (job === 'write' ? env('ROBOT_MODEL_WRITE') : env('ROBOT_MODEL_EXTRACT')) ??
  (job === 'write' ? provider?.write : provider?.extract)

function buildRequest({ system, user, model, maxTokens }) {
  const headers = { 'content-type': 'application/json', ...provider.headers(provider.key) }

  if (provider.style === 'anthropic') {
    return {
      headers,
      body: {
        model,
        max_tokens: maxTokens,
        system,
        messages: [{ role: 'user', content: user }],
      },
    }
  }

  return {
    headers,
    body: {
      model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      response_format: { type: 'json_object' },
      max_tokens: maxTokens,
    },
  }
}

function readReply(payload) {
  if (provider.style === 'anthropic') {
    return (payload?.content ?? [])
      .filter((part) => part?.type === 'text')
      .map((part) => part.text)
      .join('')
  }
  return payload?.choices?.[0]?.message?.content ?? ''
}

// Models wrap JSON in a fence or add a line of chat around it often enough that
// pulling the outermost braces out is worth doing rather than failing the run.
function parseJson(text) {
  const trimmed = String(text).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const start = trimmed.indexOf('{')
    const end = trimmed.lastIndexOf('}')
    if (start === -1 || end <= start) throw new Error('the model did not return JSON')
    return JSON.parse(trimmed.slice(start, end + 1))
  }
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

async function callOnce({ system, user, model, maxTokens }) {
  const request = buildRequest({ system, user, model, maxTokens })
  const response = await fetch(provider.url, {
    method: 'POST',
    headers: request.headers,
    body: JSON.stringify(request.body),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  })

  if (!response.ok) {
    const detail = (await response.text().catch(() => '')).slice(0, 400)
    const error = new Error(`${provider.label} returned ${response.status}: ${detail}`)
    error.status = response.status
    throw error
  }

  return readReply(await response.json())
}

/**
 * One model call that must come back as JSON.
 *
 * Retries once. A 429 on a free tier means the minute or day bucket is empty,
 * so that one waits 30 seconds first. If the retry also fails the caller gives
 * up on that item for this run and the next run picks it up.
 */
export async function ask({ system, user, model, maxTokens = 4096, json = true }) {
  if (!provider) throw new Error(NO_KEY_MESSAGE)
  const chosen = model ?? modelFor('extract')

  let lastError = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await callOnce({ system, user, model: chosen, maxTokens })
      return json ? parseJson(text) : text
    } catch (error) {
      lastError = error
      const status = error.status ?? 0
      const retryable = status === 429 || status >= 500 || error.name === 'TimeoutError'
      if (attempt === 1 || !retryable) break
      const wait = status === 429 ? RATE_LIMIT_WAIT_MS : 2000
      console.log(`  model call failed (${status || error.name}), waiting ${wait / 1000}s and trying once more`)
      await sleep(wait)
    }
  }

  throw new Error(`model call failed: ${lastError?.message ?? 'unknown error'}`)
}
