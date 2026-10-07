function WeatherHud({ data }) {
  return (
    <div className="context-content weather-hud">
      <div className="context-kicker">ENVIRONMENT // LIVE</div>
      <div className="weather-primary">
        <strong>{Math.round(data.temperature)}°</strong>
        <div>
          <h3>{data.condition}</h3>
          <p>{data.location}</p>
        </div>
      </div>
      <div className="weather-metrics">
        <span>FEELS <b>{Math.round(data.apparentTemperature)}°</b></span>
        <span>HUMIDITY <b>{data.humidity}%</b></span>
        <span>WIND <b>{Math.round(data.windSpeed)} km/h</b></span>
      </div>
      <div className="mini-forecast">
        {(data.forecast || []).slice(0, 3).map((day) => (
          <div key={day.date}>
            <small>{new Date(day.date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' })}</small>
            <strong>{Math.round(day.max)}° / {Math.round(day.min)}°</strong>
            <span>{day.rainChance ?? 0}% rain</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScheduleHud({ data }) {
  return (
    <div className="context-content">
      <div className="context-kicker">CALENDAR // UPCOMING</div>
      <div className="context-list">
        {(data.events || []).slice(0, 5).map((event) => (
          <div className="context-row" key={event.id || event.start}>
            <time>
              {event.start
                ? new Date(event.start).toLocaleString([], {
                    weekday: 'short',
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                : '--'}
            </time>
            <div>
              <strong>{event.title}</strong>
              <span>{event.location || 'Calendar event'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function EmailHud({ data }) {
  return (
    <div className="context-content">
      <div className="context-kicker">GMAIL // UNREAD</div>
      <div className="context-list">
        {(data.emails || []).slice(0, 5).map((email) => (
          <div className="context-row" key={email.id}>
            <span className="email-pip" />
            <div>
              <strong>{email.subject}</strong>
              <span>{email.from || email.snippet}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function AgentHud({ data }) {
  return (
    <div className="context-content">
      <div className="context-kicker">LOCAL AGENT // STATUS</div>
      <h3>{data.online ? 'Desktop channel online' : 'Desktop channel unavailable'}</h3>
      <p>
        {data.online
          ? 'A paired local companion can receive allow-listed desktop actions.'
          : 'The cloud interface is active, but no trusted desktop companion is connected.'}
      </p>
    </div>
  )
}

export default function ContextHud({ hud, actions, onAction, onGoogleConnect }) {
  if (!hud && !actions?.length) return null

  return (
    <aside className="context-hud context-hud-v2">
      <div className="context-bracket context-bracket-a" />
      <div className="context-bracket context-bracket-b" />

      {hud?.type === 'weather' && <WeatherHud data={hud} />}
      {hud?.type === 'schedule' && <ScheduleHud data={hud} />}
      {hud?.type === 'email' && <EmailHud data={hud} />}
      {hud?.type === 'agent' && <AgentHud data={hud} />}

      {hud?.type === 'integration' && (
        <div className="context-content">
          <div className="context-kicker">INTEGRATION // REQUIRED</div>
          <h3>{hud.service}</h3>
          <p>That service is not paired with this ADONIS instance yet.</p>
          {hud.service?.includes('Google') && (
            <button className="hud-action" onClick={onGoogleConnect}>
              LINK GOOGLE
            </button>
          )}
        </div>
      )}

      {hud?.type === 'action' && (
        <div className="context-content">
          <div className="context-kicker">ACTION // ARMED</div>
          <h3>{hud.title}</h3>
          <p>{hud.subtitle}</p>
        </div>
      )}

      {hud?.type === 'error' && (
        <div className="context-content context-error">
          <div className="context-kicker">EXECUTOR // FAULT</div>
          <h3>{hud.title}</h3>
          <p>{hud.subtitle}</p>
        </div>
      )}

      {!!actions?.length && (
        <div className="action-stack">
          {actions.map((action, index) => (
            <button
              className="hud-action"
              key={(action.url || action.label) + index}
              onClick={() => onAction(action)}
            >
              {action.label}
              <span>↗</span>
            </button>
          ))}
        </div>
      )}
    </aside>
  )
}
