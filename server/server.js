import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { createHmac, timingSafeEqual } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { GoogleGenAI } from '@google/genai'
import {
  consumeGoogleOAuthState,
  finishGoogleOAuth,
  getGoogleAuthUrl,
  getGoogleStatus,
} from './google.js'
import { getLocalAgentStatus } from './localAgent.js'
import {
  executeTool,
  listCapabilities,
  toolDeclarations,
} from './tools.js'

const app = express()
const port = process.env.PORT || 3001

const fastModel = 'gemini-3.5-flash-lite'
const advancedModel = 'gemini-3.8-flash'
const accessKey = String(process.env.ADONIS_ACCESS_KEY || '').trim()

function normalizeAccessKey(value) {
  return String(value || '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
}

function digestAccessValue(value) {
  return createHmac('sha256', accessKey || 'adonis-unconfigured')
    .update(String(value))
    .digest()
}

function matchesAccessKey(candidate) {
  if (!accessKey) return false

  const expected = digestAccessValue(normalizeAccessKey(accessKey))
  const actual = digestAccessValue(normalizeAccessKey(candidate))

  return timingSafeEqual(expected, actual)
}

function accessToken() {
  return createHmac('sha256', accessKey)
    .update('adonis-access-session-v1')
    .digest('hex')
}

function readCookie(req, name) {
  const cookies = String(req.headers.cookie || '')
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)

  for (const cookie of cookies) {
    const separator = cookie.indexOf('=')
    if (separator === -1) continue
    if (cookie.slice(0, separator) === name) {
      return decodeURIComponent(cookie.slice(separator + 1))
    }
  }

  return ''
}

function hasAccess(req) {
  if (!accessKey) return false

  const cookie = readCookie(req, 'adonis_access')
  if (!cookie) return false

  const expected = Buffer.from(accessToken())
  const actual = Buffer.from(cookie)

  return (
    expected.length === actual.length &&
    timingSafeEqual(expected, actual)
  )
}

function accessCookieOptions(req) {
  const secure =
    req.secure || String(req.headers['x-forwarded-proto'] || '') === 'https'

  return [
    'HttpOnly',
    'SameSite=Lax',
    'Path=/',
    secure ? 'Secure' : '',
  ]
    .filter(Boolean)
    .join('; ')
}

const systemInstruction = [
  'You are ADONIS, a concise, calm, capable personal AI assistant.',
  'Answer directly and naturally.',
  'Do not claim real-world actions unless a tool confirms them.',
  'Keep ordinary answers compact unless the user requests detail.',
].join(' ')

app.use(express.json({ limit: '32kb' }))

function normalizeMemories(memories) {
  if (!Array.isArray(memories)) return []

  return memories
    .slice(-30)
    .map((item) => String(item || '').trim().slice(0, 500))
    .filter(Boolean)
}

function memoryInstruction(memories) {
  const saved = normalizeMemories(memories)
  if (!saved.length) return ''

  return [
    'USER-APPROVED LONG-TERM MEMORIES:',
    ...saved.map((memory, index) => String(index + 1) + '. ' + memory),
    'Use these memories only when relevant. Do not invent additional memories.',
  ].join('\n')
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return []

  return history
    .slice(-8)
    .map((item) => ({
      role: item?.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(item?.text || '').slice(0, 3000) }],
    }))
    .filter((item) => item.parts[0].text.trim())
}

function needsTools(message) {
  return /\b(weather|temperature|forecast|rain|umbrella|calendar|schedule|meeting|email|gmail|open\s+(youtube|github|gmail|calendar|google|render|browser|spotify|vscode)|search\s+(the\s+)?web|search\s+for|latest\s+(news|information|docs|documentation)|volume\s+(up|down)|mute\s+(volume|sound)|github desktop|desktop companion)\b/i.test(
    message,
  )
}

function needsAdvancedReasoning(message) {
  return (
    message.length > 500 ||
    /\b(prove|derive|debug|deep analysis|analyze deeply|architecture|complex reasoning|step by step|detailed reasoning|hard problem)\b/i.test(
      message,
    )
  )
}

app.get('/api/health', async (_req, res) => {
  const [google, localAgent] = await Promise.all([
    getGoogleStatus(),
    getLocalAgentStatus(),
  ])

  res.json({
    ok: true,
    aiConfigured: Boolean(
      process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
    ),
    accessConfigured: Boolean(accessKey),
    unlocked: hasAccess(_req),
    models: {
      fast: fastModel,
      advanced: advancedModel,
    },
    capabilities: listCapabilities(),
    integrations: {
      google,
      localAgent,
    },
  })
})

app.get('/api/access-status', (req, res) => {
  res.json({
    configured: Boolean(accessKey),
    unlocked: hasAccess(req),
  })
})

app.post('/api/unlock', (req, res) => {
  if (!accessKey) {
    return res.status(503).json({
      unlocked: false,
      error: 'ADONIS access keyword is not configured.',
    })
  }

  const keyword = String(req.body?.keyword || '')

  if (!matchesAccessKey(keyword)) {
    return res.status(401).json({
      unlocked: false,
      message: 'Enter keyword to continue.',
    })
  }

  res.setHeader(
    'Set-Cookie',
    'adonis_access=' +
      encodeURIComponent(accessToken()) +
      '; ' +
      accessCookieOptions(req),
  )

  res.json({
    unlocked: true,
    message: 'Access granted.',
  })
})

app.post('/api/lock', (req, res) => {
  const secure =
    req.secure || String(req.headers['x-forwarded-proto'] || '') === 'https'

  res.setHeader(
    'Set-Cookie',
    'adonis_access=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0' +
      (secure ? '; Secure' : ''),
  )

  res.json({ unlocked: false })
})

app.get('/api/google/auth-url', async (_req, res) => {
  try {
    const url = await getGoogleAuthUrl()
    res.json({ url })
  } catch (error) {
    res.status(503).json({ error: error.message })
  }
})

app.get('/api/google/callback', async (req, res) => {
  const code = String(req.query.code || '')
  const state = String(req.query.state || '')

  if (!code) {
    return res.status(400).send('Missing Google authorization code.')
  }

  if (!consumeGoogleOAuthState(state)) {
    return res.status(400).send('Invalid or expired Google authorization state.')
  }

  try {
    await finishGoogleOAuth(code)
    const appUrl = process.env.APP_URL || 'http://localhost:5173'
    res.redirect(appUrl + '/?google=connected')
  } catch (error) {
    console.error('Google OAuth callback failed:', error)
    res.status(500).send('Google connection failed. Check the server terminal.')
  }
})

async function runFastResponse(
  ai,
  message,
  history,
  memories,
  advanced = false,
) {
  const contents = [
    ...normalizeHistory(history),
    {
      role: 'user',
      parts: [{ text: message }],
    },
  ]

  const response = await ai.models.generateContent({
    model: advanced ? advancedModel : fastModel,
    contents,
    config: {
      systemInstruction: [systemInstruction, memoryInstruction(memories)]
        .filter(Boolean)
        .join('\n\n'),
      thinkingConfig: {
        thinkingLevel: advanced ? 'low' : 'minimal',
      },
      maxOutputTokens: advanced ? 700 : 320,
    },
  })

  return {
    reply: response.text || 'No text response was generated.',
    interactionId: null,
    hud: null,
    actions: [],
    toolLog: [],
    route: advanced ? 'advanced' : 'fast',
  }
}

async function runToolResponse(ai, message, history, memories) {
  const historyText = normalizeHistory(history)
    .map((item) => {
      const label = item.role === 'model' ? 'ADONIS' : 'USER'
      return label + ': ' + item.parts[0].text
    })
    .join('\n')

  const input = [
    systemInstruction,
    memoryInstruction(memories),
    'Use available tools when the request requires current data or an external action.',
    'Browser actions are prepared for visible user activation.',
    'Use run_local_action only for explicitly requested allow-listed harmless desktop actions.',
    '',
    historyText ? 'RECENT CONTEXT:\n' + historyText : '',
    '',
    'USER DIRECTIVE:',
    message,
  ]
    .filter(Boolean)
    .join('\n')

  let interaction = await ai.interactions.create({
    model: fastModel,
    input,
    tools: toolDeclarations,
    generation_config: {
      thinking_level: 'minimal',
    },
  })

  let hud = null
  const actions = []
  const toolLog = []

  for (let round = 0; round < 3; round += 1) {
    const calls = (interaction.steps || []).filter(
      (step) => step.type === 'function_call',
    )

    if (!calls.length) break

    const functionResults = []

    for (const call of calls) {
      let outcome

      try {
        outcome = await executeTool(call.name, call.arguments || {})
      } catch (error) {
        outcome = {
          modelResult: {
            ok: false,
            error: error.message,
          },
          hud: {
            type: 'error',
            title: 'Executor failure',
            subtitle: error.message,
          },
        }
      }

      if (outcome.hud) hud = outcome.hud
      if (outcome.action) actions.push(outcome.action)

      toolLog.push({
        name: call.name,
        status: outcome.modelResult?.ok === false ? 'error' : 'complete',
      })

      functionResults.push({
        type: 'function_result',
        name: call.name,
        call_id: call.id,
        result: [
          {
            type: 'text',
            text: JSON.stringify(outcome.modelResult),
          },
        ],
      })
    }

    interaction = await ai.interactions.create({
      model: fastModel,
      previous_interaction_id: interaction.id,
      input: functionResults,
      tools: toolDeclarations,
      generation_config: {
        thinking_level: 'minimal',
      },
    })
  }

  return {
    reply:
      interaction.output_text ||
      'Directive processed. No additional text response was generated.',
    interactionId: interaction.id,
    hud,
    actions,
    toolLog,
    route: 'tools',
  }
}

app.post('/api/chat', async (req, res) => {
  if (!hasAccess(req)) {
    return res.status(423).json({
      locked: true,
      error: 'Enter keyword to continue.',
    })
  }

  const message = String(req.body?.message || '').trim()
  const history = req.body?.history
  const memories = normalizeMemories(req.body?.memories)

  if (!message) {
    return res.status(400).json({ error: 'Command is required.' })
  }

  if (message.length > 4000) {
    return res.status(400).json({ error: 'Command is too long.' })
  }

  const geminiApiKey =
    process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY

  if (!geminiApiKey) {
    return res.status(503).json({
      error:
        'Gemini is not configured. Add GEMINI_API_KEY (or GOOGLE_API_KEY) to the server environment.',
    })
  }

  const startedAt = Date.now()

  try {
    const ai = new GoogleGenAI({ apiKey: geminiApiKey })

    let result

    if (needsTools(message)) {
      result = await runToolResponse(ai, message, history, memories)
    } else {
      result = await runFastResponse(
        ai,
        message,
        history,
        memories,
        needsAdvancedReasoning(message),
      )
    }

    res.setHeader('Server-Timing', 'adonis;dur=' + (Date.now() - startedAt))
    res.json({
      ...result,
      latencyMs: Date.now() - startedAt,
    })
  } catch (error) {
    console.error('Gemini request failed:', error)
    res.status(500).json({
      error:
        'The neural core failed to respond. Check the server terminal for details.',
    })
  }
})

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const distPath = path.resolve(__dirname, '../dist')

app.use(express.static(distPath))
app.use((req, res, next) => {
  if (req.method !== 'GET' || req.path.startsWith('/api/')) return next()

  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next()
  })
})

app.listen(port, () => {
  console.log(`ADONIS server online at http://localhost:${port}`)
})
