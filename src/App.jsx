import { useEffect, useMemo, useState } from 'react'
import CoreScene from './components/CoreScene.jsx'
import ContextHud from './components/ContextHud.jsx'
import VoiceWaveform from './components/VoiceWaveform.jsx'

const quickCommands = [
  ['WEATHER', 'What is the weather in Noida today?'],
  ['SCHEDULE', 'What is on my schedule?'],
  ['EMAIL', 'Summarize my unread emails.'],
  ['SEARCH', 'Search the web for the latest Gemini API documentation.'],
]

function App() {
  const [booted, setBooted] = useState(false)
  const [command, setCommand] = useState('')
  const [lastCommand, setLastCommand] = useState('')
  const [status, setStatus] = useState('STANDBY')
  const [reply, setReply] = useState('Neural interface ready. Awaiting directive.')
  const [error, setError] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [aiOnline, setAiOnline] = useState(false)
  const [interactionId, setInteractionId] = useState(null)
  const [hud, setHud] = useState(null)
  const [actions, setActions] = useState([])
  const [toolLog, setToolLog] = useState([])
  const [googleStatus, setGoogleStatus] = useState({
    configured: false,
    connected: false,
  })

  const clock = useClock()

  useEffect(() => {
    const timer = window.setTimeout(() => setBooted(true), 2200)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    refreshHealth()

    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      setReply('Google Calendar and Gmail link established.')
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  async function refreshHealth() {
    try {
      const response = await fetch('/api/health')
      const data = await response.json()
      setAiOnline(Boolean(data.aiConfigured))
      setGoogleStatus(
        data.integrations?.google || { configured: false, connected: false },
      )
    } catch {
      setAiOnline(false)
    }
  }

  async function sendCommand(text) {
    const clean = String(text || '').trim()
    if (!clean || status === 'PROCESSING') return

    window.speechSynthesis?.cancel()
    setCommand('')
    setLastCommand(clean)
    setError('')
    setHud(null)
    setActions([])
    setToolLog([])
    setStatus('PROCESSING')
    setReply('Analyzing directive...')

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: clean,
          previousInteractionId: interactionId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'AI request failed.')
      }

      setReply(data.reply)
      setInteractionId(data.interactionId || null)
      setHud(data.hud || null)
      setActions(data.actions || [])
      setToolLog(data.toolLog || [])
      setAiOnline(true)

      if (voiceEnabled) {
        speak(data.reply)
      } else {
        setStatus('READY')
        window.setTimeout(() => setStatus('STANDBY'), 1800)
      }

      refreshHealth()
    } catch (requestError) {
      setStatus('ERROR')
      setError(requestError.message)
      setReply('AI link unavailable.')
      window.setTimeout(() => setStatus('STANDBY'), 3200)
    }
  }

  function submitCommand(event) {
    event.preventDefault()
    sendCommand(command)
  }

  function startListening() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError(
        'Voice recognition is not supported by this browser. Use Chrome or type your command.',
      )
      return
    }

    const recognition = new SpeechRecognition()
    recognition.lang = 'en-IN'
    recognition.interimResults = false
    recognition.continuous = false

    recognition.onstart = () => {
      setListening(true)
      setStatus('LISTENING')
      setError('')
    }

    recognition.onresult = (event) => {
      const transcript = event.results?.[0]?.[0]?.transcript || ''
      setCommand(transcript)
      if (transcript.trim()) sendCommand(transcript)
    }

    recognition.onerror = (event) => {
      setListening(false)
      setStatus('STANDBY')
      if (event.error !== 'no-speech') {
        setError('Microphone error: ' + event.error)
      }
    }

    recognition.onend = () => {
      setListening(false)
      setStatus((current) =>
        current === 'LISTENING' ? 'STANDBY' : current,
      )
    }

    recognition.start()
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) {
      setStatus('READY')
      return
    }

    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    const voices = window.speechSynthesis.getVoices()
    const preferred =
      voices.find(
        (voice) =>
          /en(-|_)GB/i.test(voice.lang) && /male|daniel|george/i.test(voice.name),
      ) || voices.find((voice) => /en(-|_)GB/i.test(voice.lang))

    if (preferred) utterance.voice = preferred

    utterance.rate = 0.96
    utterance.pitch = 0.82
    utterance.volume = 0.94

    utterance.onstart = () => setStatus('SPEAKING')
    utterance.onend = () => setStatus('STANDBY')
    utterance.onerror = () => setStatus('STANDBY')

    window.speechSynthesis.speak(utterance)
  }

  function openAction(action) {
    if (action?.type !== 'open_url' || !action.url) return
    window.open(action.url, '_blank', 'noopener,noreferrer')
  }

  async function connectGoogle() {
    try {
      setError('')
      const response = await fetch('/api/google/auth-url')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          data.error ||
            'Google OAuth is not configured in the server environment.',
        )
      }

      window.location.assign(data.url)
    } catch (connectError) {
      setError(connectError.message)
    }
  }

  function resetConversation() {
    setInteractionId(null)
    setReply('Conversation memory cleared. Awaiting directive.')
    setLastCommand('')
    setHud(null)
    setActions([])
    setToolLog([])
    setError('')
    window.speechSynthesis?.cancel()
    setStatus('STANDBY')
  }

  if (!booted) return <BootSequence />

  const voiceActive =
    listening || status === 'SPEAKING' || status === 'PROCESSING'

  return (
    <main className="jarvis-shell">
      <div className="ambient-grid" />
      <div className="scan-sweep" />
      <div className="screen-vignette" />

      <header className="command-header">
        <div className="identity">
          <span className="identity-glyph">J</span>
          <div>
            <strong>J.A.R.V.I.S</strong>
            <small>NEURAL COMMAND INTERFACE</small>
          </div>
        </div>

        <div className="header-center">
          <span className={aiOnline ? 'link-live' : 'link-warn'} />
          {aiOnline ? 'AI CORE LINKED' : 'AI CORE UNPAIRED'}
        </div>

        <div className="clock-block">
          <small>LOCAL TIME</small>
          <strong>{clock}</strong>
        </div>
      </header>

      <section className="interface-stage">
        <aside className="telemetry-rail telemetry-left">
          <Telemetry label="RENDER" value="WEBGL" live />
          <Telemetry
            label="VOICE"
            value={voiceEnabled ? 'ARMED' : 'MUTED'}
            live={voiceEnabled}
          />
          <Telemetry
            label="GEMINI"
            value={aiOnline ? 'LINKED' : 'STANDBY'}
            live={aiOnline}
          />
          <Telemetry
            label="GOOGLE"
            value={googleStatus.connected ? 'PAIRED' : 'UNPAIRED'}
            live={googleStatus.connected}
          />
        </aside>

        <section className="core-stage">
          <div className="radial-scale radial-scale-one" />
          <div className="radial-scale radial-scale-two" />

          <div className="core-status-label core-status-left">
            <span>STATE</span>
            <strong>{status}</strong>
          </div>

          <div className="core-status-label core-status-right">
            <span>MODEL</span>
            <strong>GEMINI 3.8 FLASH</strong>
          </div>

          <CoreScene status={status} />

          <div className="core-readout">
            <small>NEURAL CORE // 01</small>
            <h1>{statusHeadline(status)}</h1>
            <p>
              {lastCommand
                ? 'DIRECTIVE: ' + lastCommand
                : 'Voice and text channels ready.'}
            </p>
          </div>

          <VoiceWaveform
            active={voiceActive}
            mode={
              status === 'LISTENING'
                ? 'LISTENING'
                : status === 'SPEAKING'
                  ? 'VOICE OUTPUT'
                  : status === 'PROCESSING'
                    ? 'NEURAL PROCESS'
                    : 'STANDBY'
            }
          />
        </section>

        <aside className="telemetry-rail telemetry-right">
          <div className="trace-title">TOOL TRACE</div>
          {toolLog.length ? (
            toolLog.map((tool, index) => (
              <div className="trace-row" key={tool.name + index}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{tool.name.replaceAll('_', ' ').toUpperCase()}</strong>
                <i className={tool.status === 'complete' ? 'trace-ok' : ''}>
                  {tool.status}
                </i>
              </div>
            ))
          ) : (
            <div className="trace-empty">
              Context modules deploy when required.
            </div>
          )}
        </aside>

        <ContextHud
          hud={hud}
          actions={actions}
          onAction={openAction}
          onGoogleConnect={connectGoogle}
        />
      </section>

      <section className={'neural-response ' + (error ? 'neural-error' : '')}>
        <div className="response-meta">
          <span>NEURAL RESPONSE // {interactionId ? interactionId.slice(-6).toUpperCase() : 'LOCAL'}</span>
          <span>{error ? 'FAULT' : status}</span>
        </div>
        <Typewriter text={error || reply} />
      </section>

      <section className="command-zone">
        <form className="command-dock" onSubmit={submitCommand}>
          <button
            type="button"
            className={'voice-trigger ' + (listening ? 'voice-trigger-live' : '')}
            onClick={startListening}
            aria-label="Start voice input"
          >
            <span />
            <i>MIC</i>
          </button>

          <div className="command-field">
            <small>DIRECTIVE INPUT</small>
            <input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder={listening ? 'Listening...' : 'Speak or enter a command'}
              disabled={status === 'PROCESSING'}
            />
          </div>

          <button
            className="execute-command"
            type="submit"
            disabled={status === 'PROCESSING'}
          >
            EXECUTE <span>↗</span>
          </button>
        </form>

        <div className="command-shortcuts">
          {quickCommands.map(([label, prompt]) => (
            <button key={label} onClick={() => sendCommand(prompt)}>
              {label}
            </button>
          ))}
          <button onClick={() => setVoiceEnabled((value) => !value)}>
            {voiceEnabled ? 'VOICE: ON' : 'VOICE: OFF'}
          </button>
          {!googleStatus.connected && (
            <button onClick={connectGoogle}>LINK GOOGLE</button>
          )}
          <button onClick={resetConversation}>NEW SESSION</button>
        </div>
      </section>

      <footer className="system-footer">
        <span>JARVIS // BUILD 0.6</span>
        <span>CONTEXTUAL HUD ACTIVE</span>
        <span>THREE.JS CORE</span>
        <span>{navigator.onLine ? 'NETWORK ONLINE' : 'NETWORK OFFLINE'}</span>
      </footer>
    </main>
  )
}

function statusHeadline(status) {
  if (status === 'LISTENING') return 'Listening.'
  if (status === 'PROCESSING') return 'Analyzing.'
  if (status === 'SPEAKING') return 'Responding.'
  if (status === 'READY') return 'Directive complete.'
  if (status === 'ERROR') return 'Link fault.'
  return 'Awaiting directive.'
}

function Telemetry({ label, value, live = false }) {
  return (
    <div className="telemetry-item">
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={live ? 'telemetry-live' : ''} />
    </div>
  )
}

function Typewriter({ text }) {
  const [visible, setVisible] = useState(text)

  useEffect(() => {
    const value = String(text || '')
    if (value.length > 900) {
      setVisible(value)
      return undefined
    }

    setVisible('')
    let index = 0
    const step = Math.max(1, Math.ceil(value.length / 110))

    const timer = window.setInterval(() => {
      index = Math.min(value.length, index + step)
      setVisible(value.slice(0, index))
      if (index >= value.length) window.clearInterval(timer)
    }, 14)

    return () => window.clearInterval(timer)
  }, [text])

  return <p>{visible}<span className="typing-cursor" /></p>
}

function useClock() {
  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat('en-GB', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    [],
  )

  const [time, setTime] = useState(formatter.format(new Date()))

  useEffect(() => {
    const id = window.setInterval(
      () => setTime(formatter.format(new Date())),
      1000,
    )
    return () => window.clearInterval(id)
  }, [formatter])

  return time
}

function BootSequence() {
  return (
    <main className="boot-sequence">
      <div className="boot-core">
        <span />
        <i />
        <b />
      </div>
      <small>J.A.R.V.I.S // COLD START</small>
      <div className="boot-log">
        <span>RENDER ENGINE ............... ONLINE</span>
        <span>VOICE SUBSYSTEM .............. ONLINE</span>
        <span>NEURAL ROUTER ................ ONLINE</span>
        <span>EXTERNAL TOOLS ............... ARMED</span>
      </div>
      <div className="boot-track"><i /></div>
    </main>
  )
}

export default App
