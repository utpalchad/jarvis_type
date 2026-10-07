const SAFE_ACTIONS = new Set([
  'open_vscode',
  'open_browser',
  'open_spotify',
  'open_github_desktop',
  'volume_up',
  'volume_down',
  'mute_volume',
])

function config() {
  const baseUrl = String(process.env.LOCAL_AGENT_URL || '').trim().replace(/\/$/, '')
  const token = String(process.env.LOCAL_AGENT_TOKEN || '').trim()

  return {
    configured: Boolean(baseUrl && token),
    baseUrl,
    token,
  }
}

async function agentFetch(pathname, options = {}) {
  const settings = config()

  if (!settings.configured) {
    throw new Error('Local desktop agent is not paired.')
  }

  const response = await fetch(settings.baseUrl + pathname, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: 'Bearer ' + settings.token,
      ...(options.headers || {}),
    },
    signal: AbortSignal.timeout(2200),
  })

  if (!response.ok) {
    throw new Error('Local desktop agent returned ' + response.status + '.')
  }

  const contentType = response.headers.get('content-type') || ''
  return contentType.includes('application/json')
    ? response.json()
    : { ok: true }
}

export async function getLocalAgentStatus() {
  const settings = config()

  if (!settings.configured) {
    return {
      configured: false,
      online: false,
    }
  }

  try {
    const data = await agentFetch('/health')
    return {
      configured: true,
      online: data?.ok !== false,
      name: data?.name || 'Desktop Companion',
    }
  } catch {
    return {
      configured: true,
      online: false,
    }
  }
}

export async function runLocalAgentAction(action) {
  if (!SAFE_ACTIONS.has(action)) {
    throw new Error('Desktop action is not allow-listed.')
  }

  const status = await getLocalAgentStatus()
  if (!status.online) {
    return {
      ok: false,
      connected: false,
      action,
      message: 'No trusted local desktop companion is online.',
    }
  }

  const result = await agentFetch('/action', {
    method: 'POST',
    body: JSON.stringify({ action }),
  })

  return {
    ok: result?.ok !== false,
    connected: true,
    action,
    message: result?.message || 'Desktop action completed.',
  }
}
