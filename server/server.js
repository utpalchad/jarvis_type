import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleGenAI } from '@google/genai'
import {
  consumeGoogleOAuthState,
  finishGoogleOAuth,
  getGoogleAuthUrl,
  getGoogleStatus,
} from './google.js'
import { executeTool, toolDeclarations } from './tools.js'

const app = express()
const port = process.env.PORT || 3001
const model = 'gemini-3.8-flash'

app.use(express.json({ limit: '32kb' }))

app.get('/api/health', async (_req, res) => {
  const google = await getGoogleStatus()

  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    model,
    integrations: { google },
  })
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

app.post('/api/chat', async (req, res) => {
  const message = String(req.body?.message || '').trim()
  const previousInteractionId = req.body?.previousInteractionId || undefined

  if (!message) {
    return res.status(400).json({ error: 'Command is required.' })
  }

  if (message.length > 4000) {
    return res.status(400).json({ error: 'Command is too long.' })
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({
      error: 'Gemini is not configured. Add GEMINI_API_KEY to your local .env file.',
    })
  }

  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY })

    const input = [
      'You are JARVIS, the intelligence core of a cinematic personal AI interface.',
      'Be concise, calm, capable, and practical.',
      'Never claim a real-world action occurred unless a tool result explicitly confirms it.',
      'Use the available tools when the user asks for weather, their schedule, unread email, a website to open, or a web search.',
      'Browser actions are only prepared for the user to activate; never say a website has already opened.',
      'If Calendar or Gmail is disconnected, explain that the Google Link control must be used.',
      'Keep most responses under 180 words unless the user asks for detail.',
      '',
      'USER COMMAND:',
      message,
    ].join('\n')

    let interaction = await ai.interactions.create({
      model,
      input,
      tools: toolDeclarations,
      previous_interaction_id: previousInteractionId,
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
              title: 'Tool failure',
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
        model,
        previous_interaction_id: interaction.id,
        input: functionResults,
        tools: toolDeclarations,
      })
    }

    res.json({
      reply:
        interaction.output_text ||
        'Directive processed. No additional text response was generated.',
      interactionId: interaction.id,
      hud,
      actions,
      toolLog,
    })
  } catch (error) {
    console.error('Gemini request failed:', error)
    res.status(500).json({
      error: 'The AI core failed to respond. Check the server terminal for details.',
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
  console.log(`JARVIS server online at http://localhost:${port}`)
})
