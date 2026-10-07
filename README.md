# JARVIS Type

A cinematic browser-based AI command interface inspired by high-end science-fiction HUDs.

## Current stage: v0.2

Working now:

- cinematic boot sequence
- animated AI core and HUD
- secure Gemini backend
- Gemini 3.7 Flash conversation
- browser microphone input
- browser text-to-speech output
- conversation continuity
- AI/voice status indicators
- responsive layout
- no API key exposed to the React frontend

## Free-first stack

- React + Vite
- Express
- Google GenAI SDK
- Gemini 3.7 Flash free tier
- browser Speech Recognition where supported
- browser Speech Synthesis

Free tiers have usage limits and can change.

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Create your local environment file

On Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

Or create a file named `.env` in the project root.

Put your Gemini API key inside:

```env
GEMINI_API_KEY=your_key_here
PORT=3001
```

Do not commit `.env`.

### 3. Run JARVIS

```bash
npm run dev
```

Open the Vite URL shown in the terminal, usually:

```text
http://localhost:5173
```

The backend runs on port 3001 and Vite proxies `/api` requests to it.

## Voice

Voice recognition works best in Chromium-based browsers. Click the circular microphone control, allow microphone permission, and speak. JARVIS will transcribe the command, send it to Gemini, and speak the response if VOICE ON is enabled.

## Production

```bash
npm run build
npm start
```

The Express server serves the built frontend and the private Gemini endpoint.

## Security

The Gemini API key is read only by the Node server. It is never embedded into the React bundle.

## Next

- AI tool routing
- real weather tool
- calendar integration
- safe browser actions
- richer 3D reactor
- streaming responses
