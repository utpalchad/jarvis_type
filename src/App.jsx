import { useEffect, useMemo, useState } from 'react'

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

  useEffect(() => {
    const timer = window.setTimeout(() => setBooted(true), 2300)
    return () => window.clearTimeout(timer)
  }, [])

  const clock = useClock()

  function submitCommand(event) {
    event.preventDefault()
    if (!command.trim()) return

    setStatus('PROCESSING')
    window.setTimeout(() => setStatus('READY'), 850)
    window.setTimeout(() => setStatus('STANDBY'), 2600)
    setCommand('')
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
          <span className="status-dot" />
          <span>SYSTEM ONLINE</span>
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
                  <div className="diag-ring">
                    <span>{value}</span>
                  </div>
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
                <strong>ENCRYPTED CHANNEL</strong>
                <small>Local interface // protected</small>
              </div>
            </div>
            <div className="micro-grid">
              <span>NODE 01</span><span className="ok">ACTIVE</span>
              <span>GATEWAY</span><span className="ok">LOCKED</span>
              <span>AI LINK</span><span>OFFLINE</span>
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
            <div className="orbit orbit-a">
              <i /><i /><i />
            </div>
            <div className="orbit orbit-b">
              <i /><i />
            </div>
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
            <h1>Awaiting directive.</h1>
            <span>AI services will connect here in the next stage.</span>
          </div>

          <form className="command-bar" onSubmit={submitCommand}>
            <button type="button" className="mic-btn" aria-label="Voice input">
              <span>◉</span>
            </button>
            <input
              value={command}
              onChange={(e) => setCommand(e.target.value)}
              placeholder="Enter a command..."
              aria-label="Command input"
            />
            <kbd>ENTER</kbd>
            <button className="send-btn" type="submit" aria-label="Send command">↗</button>
          </form>

          <div className="quick-actions">
            <button onClick={() => setCommand('Analyze current system status')}>ANALYZE</button>
            <button onClick={() => setCommand('Plan my day')}>PLAN</button>
            <button onClick={() => setCommand('Open project workspace')}>WORKSPACE</button>
          </div>
        </section>

        <aside className="right-rail">
          <Panel eyebrow="ENVIRONMENT" title="Local telemetry">
            <div className="environment">
              <div className="temperature">--°</div>
              <div>
                <strong>WEATHER LINK</strong>
                <small>Not connected</small>
              </div>
              <div className="radar">
                <span />
                <i />
              </div>
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
              <Service label="Voice input" />
              <Service label="Gemini" />
              <Service label="Tool routing" />
            </div>
          </Panel>
        </aside>
      </section>

      <footer className="footer-strip">
        <span>JARVIS // PROTOTYPE 0.1</span>
        <span>LOCAL MODE</span>
        <span>NO EXTERNAL SERVICES CONNECTED</span>
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
      <div className="boot-reticle">
        <span />
        <i />
      </div>
      <p>J.A.R.V.I.S // INITIALIZATION</p>
      <div className="boot-lines">
        <span>CORE INTERFACE ........ OK</span>
        <span>DISPLAY MATRIX ........ OK</span>
        <span>SECURE CHANNEL ........ OK</span>
        <span>AI SERVICES ........... STANDBY</span>
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
