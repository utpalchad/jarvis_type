import 'dotenv/config'
import express from 'express'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { GoogleGenAI } from '@google/genai'

const app = express()
const port = process.env.PORT || 3001

app.use(express.json({ limit: '32kb' }))

app.get('/api/health', (_req, res) => {
  res.json({
    ok: true,
    aiConfigured: Boolean(process.env.GEMINI_API_KEY),
    model: 'gemini-3.7-flash',
  })
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
      'You are the intelligence core of a futuristic personal assistant called JARVIS.',
      'Be concise, capable, calm, and practical. Do not pretend to have completed real-world actions unless the application actually confirms them.',
      'When the user asks a normal question, answer naturally. Keep most responses under 180 words unless detail is requested.',
      '',
      'USER COMMAND:',
      message,
    ].join('\n')

    const interaction = await ai.interactions.create({
      model: 'gemini-3.7-flash',
      input,
      previous_interaction_id: previousInteractionId,
    })

    res.json({
      reply: interaction.output_text || 'I processed the request but received no text response.',
      interactionId: interaction.id,
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
app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next()
  res.sendFile(path.join(distPath, 'index.html'), (err) => {
    if (err) next()
  })
})

app.listen(port, () => {
  console.log(`JARVIS server online at http://localhost:${port}`)
})
