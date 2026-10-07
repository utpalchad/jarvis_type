import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { randomBytes } from 'node:crypto'
import { google } from 'googleapis'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const tokenDir = path.resolve(__dirname, '../.jarvis')
const tokenFile = path.join(tokenDir, 'google-tokens.json')

const pendingStates = new Set()

const scopes = [
  'https://www.googleapis.com/auth/calendar.readonly',
  'https://www.googleapis.com/auth/gmail.readonly',
]

function getOAuthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    'http://localhost:3001/api/google/callback'

  if (!clientId || !clientSecret) return null

  return new google.auth.OAuth2(clientId, clientSecret, redirectUri)
}

async function loadSavedTokens() {
  try {
    const raw = await fs.readFile(tokenFile, 'utf8')
    return JSON.parse(raw)
  } catch {
    return null
  }
}

async function saveTokens(tokens) {
  await fs.mkdir(tokenDir, { recursive: true })
  await fs.writeFile(tokenFile, JSON.stringify(tokens, null, 2), 'utf8')
}

export async function getGoogleStatus() {
  const client = getOAuthClient()
  if (!client) {
    return { configured: false, connected: false }
  }

  const saved = await loadSavedTokens()
  return {
    configured: true,
    connected: Boolean(saved?.access_token || saved?.refresh_token),
  }
}

export async function getGoogleAuthUrl() {
  const client = getOAuthClient()
  if (!client) {
    throw new Error('Google OAuth is not configured.')
  }

  const state = randomBytes(24).toString('hex')
  pendingStates.add(state)

  return client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: true,
    scope: scopes,
    state,
  })
}

export function consumeGoogleOAuthState(state) {
  if (!state || !pendingStates.has(state)) return false
  pendingStates.delete(state)
  return true
}

export async function finishGoogleOAuth(code) {
  const client = getOAuthClient()
  if (!client) {
    throw new Error('Google OAuth is not configured.')
  }

  const { tokens } = await client.getToken(code)
  await saveTokens(tokens)
  return true
}

async function getAuthorizedClient() {
  const client = getOAuthClient()
  if (!client) {
    throw new Error('Google OAuth is not configured.')
  }

  const saved = await loadSavedTokens()
  if (!saved) {
    throw new Error('Google account is not connected.')
  }

  client.setCredentials(saved)

  client.on('tokens', async (tokens) => {
    const current = (await loadSavedTokens()) || {}
    await saveTokens({ ...current, ...tokens })
  })

  return client
}

export async function getUpcomingEvents(maxResults = 6) {
  const auth = await getAuthorizedClient()
  const calendar = google.calendar({ version: 'v3', auth })

  const response = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  })

  return (response.data.items || []).map((event) => ({
    id: event.id,
    title: event.summary || 'Untitled event',
    start: event.start?.dateTime || event.start?.date || null,
    end: event.end?.dateTime || event.end?.date || null,
    location: event.location || '',
  }))
}

export async function getUnreadEmailSummaries(maxResults = 5) {
  const auth = await getAuthorizedClient()
  const gmail = google.gmail({ version: 'v1', auth })

  const list = await gmail.users.messages.list({
    userId: 'me',
    q: 'is:unread',
    maxResults,
  })

  const messages = list.data.messages || []

  const details = await Promise.all(
    messages.map(async ({ id }) => {
      const item = await gmail.users.messages.get({
        userId: 'me',
        id,
        format: 'metadata',
        metadataHeaders: ['Subject', 'From', 'Date'],
      })

      const headers = item.data.payload?.headers || []
      const getHeader = (name) =>
        headers.find((header) => header.name?.toLowerCase() === name.toLowerCase())
          ?.value || ''

      return {
        id,
        subject: getHeader('Subject') || 'No subject',
        from: getHeader('From'),
        date: getHeader('Date'),
        snippet: item.data.snippet || '',
      }
    }),
  )

  return details
}
