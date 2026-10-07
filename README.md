# JARVIS Type

A cinematic personal AI command interface with a contextual HUD, voice input/output, a Three.js neural core, Gemini tool routing, weather, safe browser actions, and optional Google Calendar/Gmail access.

## Current build: 0.6

### Working

- React + Vite interface
- cinematic boot sequence
- Three.js holographic core
- state animations for standby, listening, processing, speaking, and error
- browser speech recognition where supported
- browser speech synthesis
- Gemini 3.8 Flash conversation
- Gemini function calling
- Open-Meteo weather tool with no API key
- safe browser/site actions that require a user click
- web-search action that prepares a Google search URL
- contextual weather/schedule/email/action HUD panels
- optional Google Calendar read-only integration
- optional Gmail read-only integration
- private server-side API keys and local OAuth token storage

## Requirements

- Node.js 22.12 or newer
- npm
- a Gemini API key from Google AI Studio
- Chrome or another compatible Chromium browser for the best voice-recognition experience

## Quick start

```bash
git pull
npm install
```

Copy the environment template:

### Windows PowerShell

```powershell
Copy-Item .env.example .env
```

Then edit `.env`:

```env
GEMINI_API_KEY=your_key_here
PORT=3001
APP_URL=http://localhost:5173
```

Run:

```bash
npm run dev
```

Open the Vite URL, normally:

```text
http://localhost:5173
```

## Commands to try

```text
Introduce yourself.
What is the weather in Noida today?
Should I carry an umbrella tomorrow in Delhi?
Open YouTube.
Open my GitHub.
Search the web for the latest Gemini API documentation.
What is on my schedule?
Summarize my unread emails.
```

Browser actions do not silently open. JARVIS prepares an action control in the contextual HUD and you choose whether to activate it.

## Google Calendar + Gmail

This step is optional. JARVIS works without it.

1. Create a Google Cloud project.
2. Enable the Google Calendar API.
3. Enable the Gmail API.
4. Configure the Google OAuth consent screen.
5. Create an OAuth 2.0 client with application type **Web application**.
6. Add this authorized redirect URI:

```text
http://localhost:3001/api/google/callback
```

7. Add the credentials to your local `.env`:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/google/callback
```

8. Restart `npm run dev`.
9. Click **LINK GOOGLE** inside JARVIS.

The app requests only read-only Calendar and Gmail scopes. OAuth tokens are stored locally inside `.jarvis/`, which is ignored by Git.

## Architecture

```text
voice / keyboard
      |
      v
React cinematic HUD
      |
      v
private Express server
      |
      v
Gemini 3.8 Flash
      |
      +--> normal answer
      +--> weather tool --> Open-Meteo
      +--> browser action --> user confirms
      +--> search action --> user confirms
      +--> calendar tool --> Google Calendar
      +--> email tool --> Gmail
      |
      v
contextual HUD + spoken response
```

## Production

```bash
npm run build
npm start
```

For a deployed Google OAuth setup, change `APP_URL` and `GOOGLE_REDIRECT_URI` to the deployed HTTPS URLs and register the same redirect URI in Google Cloud.

## Privacy and security

- Gemini API keys stay on the server.
- Google OAuth credentials stay in `.env`.
- Google OAuth tokens stay in the local `.jarvis/` folder.
- Browser actions require a visible user click.
- JARVIS does not claim Calendar/Gmail access when those services are not connected.
