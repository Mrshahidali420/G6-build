// The only file in scripts/robot/ that talks to a language model.
//
// Lane 2 uses a model to read a saved article and propose facts. Nothing the
// model says is trusted. Every sentence that reaches a page has to survive the
// code checks in extract.mjs and entities.mjs, which compare it against the
// saved raw text character by character. This file is plumbing, not judgement.
//
// Five providers, picked by which key is in the environment, in this order:
//   1. CLAUDE_CODE_OAUTH_TOKEN  The Claude Code CLI signed in with a Claude
//                              Pro or Max subscription. The default. Made once
//                              with `claude setup-token`, no per call cost.
//   2. ANTHROPIC_API_KEY        Anthropic Messages API, pay per call.
//   3. OPENROUTER_API_KEY       OpenRouter, one key in front of many models.
//   4. GITHUB_TOKEN             GitHub Models. Being retired (410 brownouts
//                              from September 2026), kept only as a fallback.
//   5. GEMINI_API_KEY           Google Gemini. Its free tier stops at 20 calls
//                              a day, fewer than one run needs, so it is last.
//
// ROBOT_AI=<id> forces one provider by its id (claude, anthropic, openrouter,
// github, gemini) when more than one key is set.
//
// Three of the four speak the OpenAI chat shape, so the table below carries the
// only things that differ: the endpoint, the headers and the default models.
//
// ROBOT_MODEL_EXTRACT and ROBOT_MODEL_WRITE override the model for whichever
// provider is in use. A key is never printed, logged or put in an error.

import { spawn } from 'node:child_process'
import { tmpdir } from 'node:os'
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs'
import { join } from 'node:path'

const TIMEOUT_MS = 120000
const RATE_LIMIT_WAIT_MS = 30000
// Free tiers allow roughly 10 to 15 requests a minute. A fixed gap between
// calls keeps the robot under that line instead of tripping it and waiting.
const MIN_GAP_MS = Number(process.env.ROBOT_CALL_GAP_MS ?? 6500)
let lastCallAt = 0

// Set the first time a provider says the day's quota is spent. From then on
// every call fails at once, with no gap and no retry, so a run with thirty
// articles left does not spend thirty minutes waiting on a bucket that will
// not refill until tomorrow. The next scheduled run starts fresh.
let quotaSpent = null

export const NO_KEY_MESSAGE = 'lane 2: no AI key configured (GITHUB_TOKEN in Actions, or an API key), skipping'

const env = (name) => {
  const value = process.env[name]
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

const bearer = (key) => ({ authorization: `Bearer ${key}` })

// Order is the pick order. The first row whose key exists, and whose opt in is
// satisfied, wins.
const PROVIDERS = [
  {
    id: 'claude',
    label: 'Claude Code CLI (subscription)',
    keyName: 'CLAUDE_CODE_OAUTH_TOKEN',
    // No URL: the call shells out to `claude -p`, which reads the token from
    // the environment itself. The token is never passed on the command line.
    style: 'cli',
    headers: () => ({}),
    extract: 'sonnet',
    write: 'sonnet',
  },
  {
    id: 'github',
    label: 'GitHub Models',
    keyName: 'GITHUB_TOKEN',
    // GITHUB_TOKEN exists in every Actions run, so the robot needs no secret.
    // The workflow grants it with `permissions: models: read`.
    url: 'https://models.github.ai/inference/chat/completions',
    style: 'openai',
    headers: bearer,
    extract: 'openai/gpt-4.1-mini',
    write: 'openai/gpt-4.1-mini',
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
    id: 'gemini',
    label: 'Google Gemini (free tier)',
    keyName: 'GEMINI_API_KEY',
    url: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    style: 'openai',
    headers: bearer,
    extract: 'gemini-3.6-flash',
    write: 'gemini-3.6-flash',
  },
]

function pickProvider() {
  const forced = env('ROBOT_AI')
  for (const row of PROVIDERS) {
    if (forced && row.id !== forced) continue
    const key = env(row.keyName)
    if (!key) continue
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

// Runs the Claude Code CLI once in print mode and returns the reply text.
// One turn, no tools, cwd in a temp dir so no CLAUDE.md from this repo is
// loaded into the prompt. The token reaches the CLI through the environment.
function callCli({ system, user, model }) {
  return new Promise((resolve, reject) => {
    // The system prompt is long and multi line, so it goes through a file,
    // never through the argument list. The user text goes through stdin.
    const dir = mkdtempSync(join(tmpdir(), 'robot-ai-'))
    const systemFile = join(dir, 'system.txt')
    writeFileSync(systemFile, system)
    const args = [
      '-p', '--output-format', 'json', '--model', model, '--max-turns', '1',
      '--system-prompt-file', systemFile, '--disallowedTools', '*',
    ]
    const child = spawn('claude', args, {
      cwd: dir,
      env: process.env,
      shell: process.platform === 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
    })
    const cleanup = () => rmSync(dir, { recursive: true, force: true })
    let out = ''
    let err = ''
    const timer = setTimeout(() => child.kill(), TIMEOUT_MS)
    child.stdout.on('data', (chunk) => { out += chunk })
    child.stderr.on('data', (chunk) => { err += chunk })
    child.on('error', (error) => { clearTimeout(timer); cleanup(); reject(error) })
    child.on('close', (code) => {
      clearTimeout(timer)
      cleanup()
      let payload = null
      try { payload = JSON.parse(out) } catch { payload = null }
      if (code !== 0 || !payload || payload.is_error) {
        const detail = (payload?.result ?? err ?? out).toString().slice(0, 400)
        const error = new Error(`${provider.label} failed (exit ${code}): ${detail}`)
        error.status = /rate limit|usage limit|limit reached/i.test(detail) ? 429 : 500
        if (/usage limit|limit reached|resets/i.test(detail)) error.quota = true
        reject(error)
        return
      }
      resolve(String(payload.result ?? ''))
    })
    child.stdin.end(user)
  })
}

async function callOnce({ system, user, model, maxTokens }) {
  const gap = MIN_GAP_MS - (Date.now() - lastCallAt)
  if (gap > 0) await sleep(gap)
  lastCallAt = Date.now()
  if (provider.style === 'cli') return callCli({ system, user, model })
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
    // A 429 that names a day bucket will not clear inside this run. Gemini
    // says "free_tier_requests" with a daily limit, GitHub Models says
    // "RateLimitReached" with a per day window in its message.
    if (response.status === 429 && /per day|daily|_day|free_tier_requests|RateLimitReached/i.test(detail)) {
      error.quota = true
    }
    // 410 is a service that has gone away, not a bucket that refills.
    if (response.status === 410) error.quota = true
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
  if (quotaSpent) throw new Error(`model call skipped: ${quotaSpent}`)
  const chosen = model ?? modelFor('extract')

  let lastError = null
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const text = await callOnce({ system, user, model: chosen, maxTokens })
      return json ? parseJson(text) : text
    } catch (error) {
      lastError = error
      const status = error.status ?? 0
      if (error.quota) {
        quotaSpent = `${provider.label} is out of quota or gone (${status}), the rest waits for the next run`
        console.log(`  ${quotaSpent}`)
        break
      }
      const retryable = status === 429 || status >= 500 || error.name === 'TimeoutError'
      if (attempt === 1 || !retryable) break
      const wait = status === 429 ? RATE_LIMIT_WAIT_MS : 2000
      console.log(`  model call failed (${status || error.name}), waiting ${wait / 1000}s and trying once more`)
      await sleep(wait)
    }
  }

  throw new Error(`model call failed: ${lastError?.message ?? 'unknown error'}`)
}
