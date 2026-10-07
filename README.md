# NEXUS

A cinematic personal AI control interface with an original identity, visually influenced by hard-edged rogue-AI control rooms and refined assistant HUDs without copying film assets, logos, character likenesses, or source code.

## Build 0.8

### Interface

- industrial black/gunmetal control-room layout
- red framing with amber/orange energy
- dense interactive Three.js neural core
- pointer-reactive core rotation
- click-reactive energy pulse
- separate states for standby, listening, reasoning, speaking, and error
- left-side core/system telemetry
- right-side response, modules, and executor trace
- bottom command console and quick modes
- contextual weather, Calendar, Gmail, action, and local-agent HUDs
- responsive laptop/tablet/mobile layout

### Intelligence

- Gemini conversation and tool calling
- modular capability registry inspired by mature assistant executor architectures
- Open-Meteo weather with no weather API key
- safe browser actions that require visible user activation
- Google Calendar read-only integration
- Gmail read-only integration
- optional trusted local desktop-agent bridge with a strict harmless-action allow-list

The local-agent bridge currently recognizes only:

```text
open_vscode
open_browser
open_spotify
open_github_desktop
volume_up
volume_down
mute_volume
```

No arbitrary shell command capability is exposed.

## Quick start

Requirements:

- Node.js 22.12+
- npm
- Gemini API key

```bash
git pull
npm install
```

Copy the environment template:

```powershell
Copy-Item .env.example .env
```

Add your Gemini key:

```env
GEMINI_API_KEY=your_key_here
PORT=3001
APP_URL=http://localhost:5173
```

Run:

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

## Commands to try

```text
Introduce yourself.
What is the weather in Noida today?
Should I carry an umbrella tomorrow in Delhi?
Open YouTube.
Search the web for the latest Gemini documentation.
What is on my schedule?
Summarize my unread emails.
Is my desktop companion online?
```

## Google Calendar + Gmail

Google integration is optional.

1. Create a Google Cloud project.
2. Enable Google Calendar API and Gmail API.
3. Configure the OAuth consent screen.
4. Create an OAuth 2.0 Web application.
5. Register:

```text
http://localhost:3001/api/google/callback
```

6. Add to `.env`:

```env
GOOGLE_CLIENT_ID=your_client_id
GOOGLE_CLIENT_SECRET=your_client_secret
GOOGLE_REDIRECT_URI=http://localhost:3001/api/google/callback
```

7. Restart the app and use **LINK GOOGLE**.

The requested scopes are read-only.

## Optional desktop companion

The cloud website cannot directly control a Windows PC. NEXUS therefore includes a local-agent integration contract instead of pretending otherwise.

The configured companion must expose:

```text
GET  /health
POST /action
Authorization: Bearer <LOCAL_AGENT_TOKEN>
```

`POST /action` receives only one of the allow-listed action names above.

Set:

```env
LOCAL_AGENT_URL=https://your-trusted-agent-endpoint
LOCAL_AGENT_TOKEN=a-long-random-secret
```

Keep these blank until you have a properly authenticated local companion. Do not make an unauthenticated desktop-control endpoint public.

## Architecture

```text
voice / keyboard
      |
      v
React cinematic control room
      |
      v
private Express server
      |
      v
Gemini
      |
      +--> normal reasoning
      +--> weather executor --> Open-Meteo
      +--> browser executor --> user confirms
      +--> search executor --> user confirms
      +--> Calendar executor --> Google Calendar
      +--> Gmail executor --> Gmail
      +--> desktop executor --> trusted local companion only
      |
      v
contextual HUD + spoken response
```

## Production

```bash
npm run build
npm start
```

For Render, set `APP_URL` to the Render URL. For deployed Google OAuth, register that HTTPS callback in Google Cloud as well.

## Security principles

- Gemini key remains server-side.
- OAuth credentials remain server-side.
- Google access is read-only.
- Browser actions require a visible user click.
- Desktop actions use a strict allow-list.
- No arbitrary shell-command tool is exposed.
- Disconnected integrations are reported as disconnected rather than simulated.
