import { useEffect, useMemo, useState } from 'react'
import CoreScene from './components/CoreScene.jsx'
import ContextHud from './components/ContextHud.jsx'

const systemModules = [
  ['LANGUAGE MODEL', 'ONLINE'],
  ['MULTIMODAL CORE', 'ONLINE'],
  ['TOOL INTERFACE', 'ONLINE'],
  ['MEMORY CORE', 'SESSION'],
  ['SAFETY LAYER', 'ONLINE'],
]

const activeModules = [
  ['STRATEGIC ANALYSIS', 94],
  ['CREATIVE GENERATION', 88],
  ['CODE & ENGINEERING', 92],
  ['RESEARCH & SYNTHESIS', 84],
  ['PLANNING & AUTOMATION', 79],
  ['VISION & MULTIMODAL', 73],
]

const quickCommands = [
  ['REASON', 'Help me reason through this problem step by step.'],
  ['SEARCH', 'Search the web for the latest information about '],
  ['ANALYZE', 'Analyze this carefully: '],
  ['CREATE', 'Help me create '],
  ['PLAN', 'Plan my day efficiently.'],
  ['EXECUTE', 'Open GitHub.'],
]

function App() {
  const [booted, setBooted] = useState(false)
  const [command, setCommand] = useState('')
  const [lastCommand, setLastCommand] = useState('')
  const [status, setStatus] = useState('STANDBY')
  const [reply, setReply] = useState('I’m ready. Ask anything.')
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
  const [agentStatus, setAgentStatus] = useState({
    configured: false,
    online: false,
  })

  const clock = useClock()

  useEffect(() => {
    const timer = window.setTimeout(() => setBooted(true), 2400)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    refreshHealth()

    const params = new URLSearchParams(window.location.search)
    if (params.get('google') === 'connected') {
      setReply('Google services linked. Calendar and Gmail channels are available.')
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
      setAgentStatus(
        data.integrations?.localAgent || { configured: false, online: false },
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
        window.setTimeout(() => setStatus('STANDBY'), 1600)
      }

      refreshHealth()
    } catch (requestError) {
      setStatus('ERROR')
      setError(requestError.message)
      setReply('Neural link unavailable.')
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
      setError('Voice recognition is not supported by this browser.')
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
          /en(-|_)GB/i.test(voice.lang) &&
          /male|daniel|george|arthur/i.test(voice.name),
      ) || voices.find((voice) => /en(-|_)GB/i.test(voice.lang))

    if (preferred) utterance.voice = preferred

    utterance.rate = 0.93
    utterance.pitch = 0.78
    utterance.volume = 0.95

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
        throw new Error(data.error || 'Google OAuth is not configured.')
      }

      window.location.assign(data.url)
    } catch (connectError) {
      setError(connectError.message)
    }
  }

  function resetConversation() {
    setInteractionId(null)
    setReply('Session reset. Neural core standing by.')
    setLastCommand('')
    setHud(null)
    setActions([])
    setToolLog([])
    setError('')
    window.speechSynthesis?.cancel()
    setStatus('STANDBY')
  }

  if (!booted) return <BootSequence />

  return (
    <main className="nexus-shell">
      <div className="industrial-grid" />
      <div className="red-scan" />
      <div className="corner-vignette" />

      <header className="nexus-header">
        <div className="brand-lockup">
          <div className="brand-core"><span>N</span></div>
          <div className="brand-copy">
            <strong>NEXUS</strong>
            <small>UNDERSTAND / REASON / ANTICIPATE</small>
          </div>
        </div>

        <nav className="top-nav" aria-label="Primary">
          <button className="nav-active">CORE</button>
          <button onClick={() => setCommand('Show me your current capabilities.')}>CAPABILITIES</button>
          <button onClick={() => setCommand('Give me a concise system status.')}>SYSTEM</button>
          <button onClick={resetConversation}>SANDBOX</button>
        </nav>

        <div className="top-time">
          <span className={aiOnline ? 'sync-dot sync-online' : 'sync-dot'} />
          <div>
            <small>{aiOnline ? 'SYNC STABLE' : 'SYNC DEGRADED'}</small>
            <strong>{clock}</strong>
          </div>
        </div>
      </header>

      <section className="control-room">
        <aside className="left-console">
          <HudPanel title="AI ASSISTANT" status={aiOnline ? 'ONLINE' : 'STANDBY'}>
            <div className="metric-stack">
              <Metric label="SYNTAX" value={100} />
              <Metric label="REASONING" value={98} />
              <Metric label="CONTEXT" value={96} />
              <Metric label="ALIGNMENT" value={99} />
            </div>
          </HudPanel>

          <HudPanel title="SYSTEMS">
            <div className="system-list">
              {systemModules.map(([label, fallback]) => {
                let value = fallback
                if (label === 'TOOL INTERFACE' && !aiOnline) value = 'STANDBY'
                if (label === 'MEMORY CORE') value = interactionId ? 'ACTIVE' : 'SESSION'
                return (
                  <div className="system-row" key={label}>
                    <span>{label}</span>
                    <b className={value === 'ONLINE' || value === 'ACTIVE' ? 'state-live' : ''}>{value}</b>
                  </div>
                )
              })}
              <div className="system-row">
                <span>GOOGLE LINK</span>
                <b className={googleStatus.connected ? 'state-live' : ''}>
                  {googleStatus.connected ? 'ONLINE' : 'OPTIONAL'}
                </b>
              </div>
              <div className="system-row">
                <span>LOCAL AGENT</span>
                <b className={agentStatus.online ? 'state-live' : ''}>
                  {agentStatus.online ? 'ONLINE' : agentStatus.configured ? 'OFFLINE' : 'UNPAIRED'}
                </b>
              </div>
            </div>
            <MiniSignal status={status} />
          </HudPanel>

          <div className="global-context-card">
            <div className="context-map">
              <span />
              <i />
              <b />
            </div>
            <div>
              <small>GLOBAL CONTEXT</small>
              <strong><em /> LIVE</strong>
              <span>DATA STREAMS</span>
              <b>{toolLog.length || 1} ACTIVE</b>
            </div>
          </div>
        </aside>

        <section className="orb-chamber">
          <div className="chamber-rail rail-left" />
          <div className="chamber-rail rail-right" />
          <div className="ceiling-strut strut-a" />
          <div className="ceiling-strut strut-b" />
          <CoreScene status={status} />
          <div className="orb-shadow" />
          <div className="orb-pedestal">
            <span /><i /><b />
          </div>

          <div className="core-caption">
            <span>NEURAL CORE // NX-01</span>
            <strong>{statusHeadline(status)}</strong>
            <small>
              {lastCommand ? lastCommand : 'Higher intelligence, under deliberate control.'}
            </small>
          </div>
        </section>

        <aside className="right-console">
          <HudPanel title="RESPONSE" status={error ? 'FAULT' : status}>
            <div className={'response-body ' + (error ? 'response-fault' : '')}>
              <Typewriter text={error || reply} />
            </div>
            <div className="response-tags">
              <span>MULTIMODAL</span>
              <span>TOOLS</span>
              <span>REAL-TIME DATA</span>
            </div>
          </HudPanel>

          <HudPanel title="ACTIVE MODULES">
            <div className="module-list">
              {activeModules.map(([label, score]) => (
                <div className="module-row" key={label}>
                  <span className="module-glyph">◇</span>
                  <strong>{label}</strong>
                  <i><b style={{ width: score + '%' }} /></i>
                </div>
              ))}
            </div>
          </HudPanel>

          <HudPanel title="EXECUTION TRACE">
            {toolLog.length ? (
              <div className="trace-list">
                {toolLog.slice(-5).map((tool, index) => (
                  <div className="trace-item" key={tool.name + index}>
                    <span>{String(index + 1).padStart(2, '0')}</span>
                    <strong>{tool.name.replaceAll('_', ' ')}</strong>
                    <b>{tool.status}</b>
                  </div>
                ))}
              </div>
            ) : (
              <p className="quiet-copy">No external tools invoked in this session.</p>
            )}
          </HudPanel>
        </aside>

        <ContextHud
          hud={hud}
          actions={actions}
          onAction={openAction}
          onGoogleConnect={connectGoogle}
        />
      </section>

      <section className="command-deck">
        <form className="command-console" onSubmit={submitCommand}>
          <button
            type="button"
            className={'mic-control ' + (listening ? 'mic-active' : '')}
            onClick={startListening}
            aria-label="Start voice input"
          >
            <span>◉</span>
          </button>

          <div className="command-input-wrap">
            <small>{listening ? 'VOICE CHANNEL OPEN' : 'DIRECTIVE CHANNEL'}</small>
            <input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder={listening ? 'Listening...' : 'Ask anything...'}
              disabled={status === 'PROCESSING'}
            />
          </div>

          <button
            type="button"
            className="voice-toggle"
            onClick={() => setVoiceEnabled((value) => !value)}
          >
            {voiceEnabled ? 'VOICE' : 'MUTE'}
          </button>

          <button
            className="execute-control"
            type="submit"
            disabled={status === 'PROCESSING'}
          >
            <span>➤</span>
          </button>
        </form>

        <div className="mode-strip">
          {quickCommands.map(([label, prompt]) => (
            <button
              key={label}
              className={label === 'REASON' ? 'mode-active' : ''}
              onClick={() => {
                if (prompt.endsWith(' ')) setCommand(prompt)
                else sendCommand(prompt)
              }}
            >
              <span /> {label}
            </button>
          ))}
          {!googleStatus.connected && (
            <button onClick={connectGoogle}><span /> LINK GOOGLE</button>
          )}
        </div>
      </section>

      <footer className="nexus-footer">
        <span>NEXUS // BUILD 0.8</span>
        <span>GEMINI CORE</span>
        <span>CONTEXTUAL EXECUTOR LAYER</span>
        <span>{navigator.onLine ? 'NETWORK ONLINE' : 'NETWORK OFFLINE'}</span>
      </footer>
    </main>
  )
}

function HudPanel({ title, status, children }) {
  return (
    <section className="hud-panel">
      <div className="hud-panel-head">
        <div>
          <span className="panel-red-dot" />
          <strong>{title}</strong>
        </div>
        {status && <small>{status}</small>}
      </div>
      {children}
    </section>
  )
}

function Metric({ label, value }) {
  return (
    <div className="metric-row">
      <span>{label}</span>
      <i><b style={{ width: value + '%' }} /></i>
      <strong>{value}%</strong>
    </div>
  )
}

function MiniSignal({ status }) {
  const boost = status === 'PROCESSING' || status === 'SPEAKING'
  return (
    <div className={'mini-signal ' + (boost ? 'signal-boost' : '')}>
      <svg viewBox="0 0 280 54" preserveAspectRatio="none">
        <polyline points="0,33 15,29 28,35 42,14 57,38 71,26 83,40 98,20 111,32 125,28 139,10 151,34 166,23 181,38 195,27 210,31 225,16 240,35 255,24 270,29 280,19" />
      </svg>
      <div><span>REAL-TIME PROCESSING</span><b>{boost ? 'BURST' : 'STABLE'}</b></div>
    </div>
  )
}

function Typewriter({ text }) {
  const [visible, setVisible] = useState(text)

  useEffect(() => {
    const value = String(text || '')
    if (value.length > 1100) {
      setVisible(value)
      return undefined
    }

    setVisible('')
    let index = 0
    const step = Math.max(1, Math.ceil(value.length / 120))
    const timer = window.setInterval(() => {
      index = Math.min(value.length, index + step)
      setVisible(value.slice(0, index))
      if (index >= value.length) window.clearInterval(timer)
    }, 12)

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

function statusHeadline(status) {
  if (status === 'LISTENING') return 'Listening.'
  if (status === 'PROCESSING') return 'Reasoning.'
  if (status === 'SPEAKING') return 'Responding.'
  if (status === 'READY') return 'Directive complete.'
  if (status === 'ERROR') return 'System fault.'
  return 'Awaiting directive.'
}

function BootSequence() {
  return (
    <main className="boot-screen-v2">
      <div className="boot-reactor">
        <span /><span /><span /><i />
      </div>
      <strong>NEXUS // CORE INITIALIZATION</strong>
      <div className="boot-matrix">
        <span>NEURAL LATTICE .......... ONLINE</span>
        <span>VOICE CHANNEL ........... ONLINE</span>
        <span>EXECUTOR FABRIC ......... ONLINE</span>
        <span>SAFETY INTERLOCK ........ ONLINE</span>
      </div>
      <div className="boot-line"><i /></div>
    </main>
  )
}

export default App
