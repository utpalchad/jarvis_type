import { useEffect, useMemo, useRef, useState } from 'react'

const diagnostics = [
  ['CORE LOAD', '18%', 'nominal'],
  ['MEMORY', '42%', 'stable'],
  ['NETWORK', '8 ms', 'secure'],
  ['UPTIME', '99.9%', 'online'],
]

const tasks = [
  { time: '18:00', title: 'Review project architecture', meta: 'Development' },
  { time: '19:30', title: 'AI core integration', meta: 'Research' },
  { time: '21:00', title: 'Interface calibration', meta: 'System' },
]

function App() {
  const [booted, setBooted] = useState(false)
  const [command, setCommand] = useState('')
  const [status, setStatus] = useState('STANDBY')
  const [reply, setReply] = useState('AI core initialized. Awaiting your directive.')
  const [error, setError] = useState('')
  const [listening, setListening] = useState(false)
  const [voiceEnabled, setVoiceEnabled] = useState(true)
  const [aiOnline, setAiOnline] = useState(false)
  const [interactionId, setInteractionId] = useState(null)
  const recognitionRef = useRef(null)

  useEffect(() => {
    const timer = window.setTimeout(() => setBooted(true), 2300)
    return () => window.clearTimeout(timer)
  }, [])

  useEffect(() => {
    fetch('/api/health')
      .then((response) => response.json())
      .then((data) => setAiOnline(Boolean(data.aiConfigured)))
      .catch(() => setAiOnline(false))
  }, [])

  const clock = useClock()

  async function sendCommand(text) {
    const clean = String(text || '').trim()
    if (!clean || status === 'PROCESSING') return

    setCommand('')
    setError('')
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
      setAiOnline(true)
      setStatus('READY')

      if (voiceEnabled) speak(data.reply)

      window.setTimeout(() => setStatus('STANDBY'), 2200)
    } catch (requestError) {
      setStatus('ERROR')
      setError(requestError.message)
      setReply('AI link unavailable.')
      window.setTimeout(() => setStatus('STANDBY'), 3000)
    }
  }

  function submitCommand(event) {
    event.preventDefault()
    sendCommand(command)
  }

  function startListening() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition

    if (!SpeechRecognition) {
      setError('Voice recognition is not supported by this browser. Use Chrome or type your command.')
      return
    }

    if (!recognitionRef.current) {
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
        setStatus((current) => current === 'LISTENING' ? 'STANDBY' : current)
      }

      recognitionRef.current = recognition
    }

    recognitionRef.current.start()
  }

  function speak(text) {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()

    const utterance = new SpeechSynthesisUtterance(text)
    utterance.rate = 1
    utterance.pitch = 0.88
    utterance.volume = 0.92

    utterance.onstart = () => setStatus('SPEAKING')
    utterance.onend = () => setStatus('STANDBY')

    window.speechSynthesis.speak(utterance)
  }

  function resetConversation() {
    setInteractionId(null)
    setReply('Conversation memory cleared. Awaiting directive.')
    setError('')
    window.speechSynthesis?.cancel()
    setStatus('STANDBY')
  }

  if (!booted) return <BootSequence />

  return (
    <main className="shell">
      <div className="noise" />
      <div className="scanline" />

      <header className="topbar hud-frame">
        <div className="brand">
          <span className="brand-mark">J</span>
          <div>
            <strong>J.A.R.V.I.S</strong>
            <small>JUST A RATHER VERY INTELLIGENT SYSTEM</small>
          </div>
        </div>

        <div className="top-status">
          <span className={'status-dot ' + (aiOnline ? '' : 'status-dot-warn')} />
          <span>{aiOnline ? 'AI LINK ONLINE' : 'AI LINK STANDBY'}</span>
          <span className="divider" />
          <span>{clock}</span>
        </div>
      </header>

      <section className="workspace">
        <aside className="left-rail">
          <Panel eyebrow="DIAGNOSTICS" title="System integrity">
            <div className="diag-grid">
              {diagnostics.map(([label, value, meta]) => (
                <div className="diag" key={label}>
                  <div className="diag-ring"><span>{value}</span></div>
                  <div>
                    <strong>{label}</strong>
                    <small>{meta}</small>
                  </div>
                </div>
              ))}
            </div>
            <SignalGraph />
          </Panel>

          <Panel eyebrow="SECURITY" title="Network perimeter">
            <div className="security-row">
              <span className="security-icon">⌁</span>
              <div>
                <strong>PRIVATE AI CHANNEL</strong>
                <small>API key remains server-side</small>
              </div>
            </div>
            <div className="micro-grid">
              <span>INTERFACE</span><span className="ok">ACTIVE</span>
              <span>VOICE</span><span className="ok">LOCAL</span>
              <span>GEMINI</span><span className={aiOnline ? 'ok' : ''}>{aiOnline ? 'ONLINE' : 'STANDBY'}</span>
            </div>
          </Panel>
        </aside>

        <section className="core-zone">
          <div className="core-label core-label-left">
            <small>INTERFACE MODE</small>
            <strong>COMMAND</strong>
          </div>

          <div className="core-label core-label-right">
            <small>AI CORE</small>
            <strong>{status}</strong>
          </div>

          <div className={'reactor ' + status.toLowerCase()}>
            <div className="orbit orbit-a"><i /><i /><i /></div>
            <div className="orbit orbit-b"><i /><i /></div>
            <div className="orbit orbit-c" />
            <div className="reticle reticle-one" />
            <div className="reticle reticle-two" />
            <div className="core-halo" />
            <div className="core-sphere">
              <div className="core-grid" />
              <div className="core-light" />
              <span className="core-glyph">J</span>
            </div>
            <div className="axis axis-x" />
            <div className="axis axis-y" />
          </div>

          <div className="core-copy">
            <p>NEURAL INTERFACE</p>
            <h1>{status === 'LISTENING' ? 'Listening.' : status === 'PROCESSING' ? 'Thinking.' : status === 'SPEAKING' ? 'Responding.' : 'Awaiting directive.'}</h1>
            <span>Gemini 3.7 Flash // voice interface // secure backend</span>
          </div>

          <div className={'response-console ' + (error ? 'response-error' : '')}>
            <div className="response-head">
              <span>JARVIS RESPONSE</span>
              <span>{status}</span>
            </div>
            <p>{error || reply}</p>
          </div>

          <form className="command-bar" onSubmit={submitCommand}>
            <button
              type="button"
              className={'mic-btn ' + (listening ? 'mic-listening' : '')}
              aria-label="Voice input"
              onClick={startListening}
              title="Voice input"
            >
              <span>◉</span>
            </button>

            <input
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              placeholder={listening ? 'Listening...' : 'Enter a command...'}
              aria-label="Command input"
              disabled={status === 'PROCESSING'}
            />

            <kbd>ENTER</kbd>
            <button className="send-btn" type="submit" aria-label="Send command" disabled={status === 'PROCESSING'}>↗</button>
          </form>

          <div className="quick-actions">
            <button onClick={() => sendCommand('Introduce yourself briefly.')}>INTRO</button>
            <button onClick={() => sendCommand('Help me plan what I should work on today.')}>PLAN</button>
            <button onClick={() => setVoiceEnabled((value) => !value)}>{voiceEnabled ? 'VOICE ON' : 'VOICE OFF'}</button>
            <button onClick={resetConversation}>NEW SESSION</button>
          </div>
        </section>

        <aside className="right-rail">
          <Panel eyebrow="ENVIRONMENT" title="Local telemetry">
            <div className="environment">
              <div className="temperature">--°</div>
              <div>
                <strong>WEATHER LINK</strong>
                <small>Tool not connected yet</small>
              </div>
              <div className="radar"><span /><i /></div>
            </div>
          </Panel>

          <Panel eyebrow="AGENDA" title="Operations queue">
            <div className="timeline">
              {tasks.map((task) => (
                <div className="timeline-item" key={task.time}>
                  <time>{task.time}</time>
                  <span className="timeline-node" />
                  <div>
                    <strong>{task.title}</strong>
                    <small>{task.meta}</small>
                  </div>
                </div>
              ))}
            </div>
          </Panel>

          <Panel eyebrow="AI STATUS" title="Core services">
            <div className="service-list">
              <Service label="Interface" active />
              <Service label="Voice input" active />
              <Service label="Voice output" active={voiceEnabled} />
              <Service label="Gemini" active={aiOnline} />
              <Service label="Tool routing" />
            </div>
          </Panel>
        </aside>
      </section>

      <footer className="footer-strip">
        <span>JARVIS // PROTOTYPE 0.2</span>
        <span>GEMINI 3.7 FLASH</span>
        <span>{aiOnline ? 'AI CORE CONNECTED' : 'ADD API KEY TO ACTIVATE AI'}</span>
      </footer>
    </main>
  )
}

function useClock() {
  const formatter = useMemo(
    () => new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }),
    [],
  )

  const [time, setTime] = useState(formatter.format(new Date()))

  useEffect(() => {
    const id = window.setInterval(() => setTime(formatter.format(new Date())), 1000)
    return () => window.clearInterval(id)
  }, [formatter])

  return time
}

function BootSequence() {
  return (
    <main className="boot-screen">
      <div className="boot-reticle"><span /><i /></div>
      <p>J.A.R.V.I.S // INITIALIZATION</p>
      <div className="boot-lines">
        <span>CORE INTERFACE ........ OK</span>
        <span>VOICE SUBSYSTEM ....... OK</span>
        <span>SECURE CHANNEL ........ OK</span>
        <span>AI SERVICES ........... CHECKING</span>
      </div>
      <div className="boot-progress"><i /></div>
    </main>
  )
}

function Panel({ eyebrow, title, children }) {
  return (
    <section className="panel hud-frame">
      <div className="panel-heading">
        <div>
          <span>{eyebrow}</span>
          <h2>{title}</h2>
        </div>
        <b>+</b>
      </div>
      {children}
    </section>
  )
}

function SignalGraph() {
  return (
    <div className="signal">
      <div className="signal-grid" />
      <svg viewBox="0 0 300 72" preserveAspectRatio="none" role="img" aria-label="System signal graph">
        <polyline points="0,54 20,50 35,54 53,30 70,43 86,22 102,48 120,41 137,50 157,18 176,38 193,34 208,49 228,28 245,44 263,35 280,39 300,16" />
      </svg>
    </div>
  )
}

function Service({ label, active = false }) {
  return (
    <div className="service">
      <span>{label}</span>
      <span className={active ? 'service-active' : ''}>{active ? 'ONLINE' : 'STANDBY'}</span>
    </div>
  )
}

export default App
