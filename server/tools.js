import {
  getGoogleStatus,
  getUpcomingEvents,
  getUnreadEmailSummaries,
} from './google.js'
import {
  getLocalAgentStatus,
  runLocalAgentAction,
} from './localAgent.js'

const knownSites = {
  youtube: 'https://www.youtube.com/',
  github: 'https://github.com/',
  gmail: 'https://mail.google.com/',
  'google calendar': 'https://calendar.google.com/',
  calendar: 'https://calendar.google.com/',
  google: 'https://www.google.com/',
  render: 'https://dashboard.render.com/',
}

function weatherText(code) {
  const map = {
    0: 'Clear',
    1: 'Mostly clear',
    2: 'Partly cloudy',
    3: 'Overcast',
    45: 'Foggy',
    48: 'Rime fog',
    51: 'Light drizzle',
    53: 'Drizzle',
    55: 'Heavy drizzle',
    61: 'Light rain',
    63: 'Rain',
    65: 'Heavy rain',
    71: 'Light snow',
    73: 'Snow',
    75: 'Heavy snow',
    80: 'Rain showers',
    81: 'Rain showers',
    82: 'Heavy showers',
    95: 'Thunderstorm',
    96: 'Thunderstorm with hail',
    99: 'Severe thunderstorm with hail',
  }

  return map[code] || 'Mixed conditions'
}

async function getWeather(location) {
  const geocodeUrl = new URL('https://geocoding-api.open-meteo.com/v1/search')
  geocodeUrl.searchParams.set('name', location)
  geocodeUrl.searchParams.set('count', '1')
  geocodeUrl.searchParams.set('language', 'en')
  geocodeUrl.searchParams.set('format', 'json')

  const geoResponse = await fetch(geocodeUrl)
  if (!geoResponse.ok) throw new Error('Weather location lookup failed.')

  const geo = await geoResponse.json()
  const place = geo.results?.[0]
  if (!place) throw new Error('I could not find that location.')

  const forecastUrl = new URL('https://api.open-meteo.com/v1/forecast')
  forecastUrl.searchParams.set('latitude', String(place.latitude))
  forecastUrl.searchParams.set('longitude', String(place.longitude))
  forecastUrl.searchParams.set(
    'current',
    'temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m',
  )
  forecastUrl.searchParams.set(
    'daily',
    'temperature_2m_max,temperature_2m_min,precipitation_probability_max,weather_code',
  )
  forecastUrl.searchParams.set('forecast_days', '3')
  forecastUrl.searchParams.set('timezone', 'auto')

  const forecastResponse = await fetch(forecastUrl)
  if (!forecastResponse.ok) throw new Error('Weather service failed.')

  const data = await forecastResponse.json()
  const current = data.current || {}
  const daily = data.daily || {}

  const placeLabel = [place.name, place.admin1, place.country]
    .filter(Boolean)
    .filter((value, index, array) => array.indexOf(value) === index)
    .join(', ')

  const result = {
    location: placeLabel,
    temperature: current.temperature_2m,
    apparentTemperature: current.apparent_temperature,
    humidity: current.relative_humidity_2m,
    windSpeed: current.wind_speed_10m,
    condition: weatherText(current.weather_code),
    forecast: (daily.time || []).map((date, index) => ({
      date,
      min: daily.temperature_2m_min?.[index],
      max: daily.temperature_2m_max?.[index],
      rainChance: daily.precipitation_probability_max?.[index],
      condition: weatherText(daily.weather_code?.[index]),
    })),
  }

  return {
    modelResult: result,
    hud: { type: 'weather', ...result },
  }
}

function resolveWebsite(destination) {
  const raw = String(destination || '').trim()
  const common = knownSites[raw.toLowerCase()]
  if (common) return common

  try {
    const url = new URL(raw)
    if (url.protocol !== 'https:') {
      throw new Error('Only HTTPS websites are supported.')
    }
    return url.toString()
  } catch {
    if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(raw)) {
      return 'https://' + raw
    }
    throw new Error('I need a recognizable site name or HTTPS URL.')
  }
}

async function getSchedule() {
  const status = await getGoogleStatus()
  if (!status.configured || !status.connected) {
    return {
      modelResult: {
        connected: false,
        message: 'Google Calendar is not connected yet.',
      },
      hud: {
        type: 'integration',
        service: 'Google Calendar',
        connected: false,
      },
    }
  }

  const events = await getUpcomingEvents()
  return {
    modelResult: { connected: true, events },
    hud: { type: 'schedule', events },
  }
}

async function getEmails() {
  const status = await getGoogleStatus()
  if (!status.configured || !status.connected) {
    return {
      modelResult: {
        connected: false,
        message: 'Gmail is not connected yet.',
      },
      hud: {
        type: 'integration',
        service: 'Gmail',
        connected: false,
      },
    }
  }

  const emails = await getUnreadEmailSummaries()
  return {
    modelResult: { connected: true, emails },
    hud: { type: 'email', emails },
  }
}

async function getAgentStatusCapability() {
  const status = await getLocalAgentStatus()
  return {
    modelResult: status,
    hud: { type: 'agent', ...status },
  }
}

async function runDesktopAction(args) {
  const outcome = await runLocalAgentAction(args.action)

  return {
    modelResult: outcome,
    hud: {
      type: 'agent',
      configured: true,
      online: Boolean(outcome.connected),
      action: args.action,
    },
  }
}

const capabilityRegistry = {
  get_weather: {
    declaration: {
      type: 'function',
      name: 'get_weather',
      description:
        'Get current weather and a short forecast for a city or place. Use for weather, temperature, rain, or umbrella questions.',
      parameters: {
        type: 'object',
        properties: {
          location: {
            type: 'string',
            description: 'City or place, optionally with state/country.',
          },
        },
        required: ['location'],
      },
    },
    handler: (args) => getWeather(args.location),
  },

  open_website: {
    declaration: {
      type: 'function',
      name: 'open_website',
      description:
        'Prepare a safe browser action when the user explicitly asks to open a website. The user activates the visible action.',
      parameters: {
        type: 'object',
        properties: {
          destination: {
            type: 'string',
            description: 'Common site name or full HTTPS URL.',
          },
        },
        required: ['destination'],
      },
    },
    handler: async (args) => {
      const url = resolveWebsite(args.destination)
      return {
        modelResult: {
          prepared: true,
          destination: args.destination,
          note: 'The user must activate the browser action in the interface.',
        },
        action: {
          type: 'open_url',
          label: 'OPEN ' + String(args.destination || 'WEBSITE').toUpperCase(),
          url,
        },
        hud: {
          type: 'action',
          title: 'Browser action prepared',
          subtitle: args.destination,
        },
      }
    },
  },

  search_web: {
    declaration: {
      type: 'function',
      name: 'search_web',
      description:
        'Prepare a web search action when the user explicitly asks to search. Do not claim the results were read.',
      parameters: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'The exact search query.',
          },
        },
        required: ['query'],
      },
    },
    handler: async (args) => {
      const query = String(args.query || '').trim()
      if (!query) throw new Error('Search query is empty.')

      const url = 'https://www.google.com/search?q=' + encodeURIComponent(query)
      return {
        modelResult: {
          prepared: true,
          query,
          note: 'A search action was prepared. Search results were not read.',
        },
        action: {
          type: 'open_url',
          label: 'OPEN SEARCH',
          url,
        },
        hud: {
          type: 'action',
          title: 'Web search prepared',
          subtitle: query,
        },
      }
    },
  },

  get_schedule: {
    declaration: {
      type: 'function',
      name: 'get_schedule',
      description:
        'Read upcoming events from the connected Google Calendar.',
      parameters: { type: 'object', properties: {} },
    },
    handler: getSchedule,
  },

  get_unread_emails: {
    declaration: {
      type: 'function',
      name: 'get_unread_emails',
      description:
        'Read short metadata summaries of unread Gmail messages from the connected account.',
      parameters: { type: 'object', properties: {} },
    },
    handler: getEmails,
  },

  get_local_agent_status: {
    declaration: {
      type: 'function',
      name: 'get_local_agent_status',
      description:
        'Check whether the user has deliberately paired a trusted local desktop companion.',
      parameters: { type: 'object', properties: {} },
    },
    handler: getAgentStatusCapability,
  },

  run_local_action: {
    declaration: {
      type: 'function',
      name: 'run_local_action',
      description:
        'Run an allow-listed harmless desktop action through the paired local companion. Use only when the user explicitly asks for that desktop action.',
      parameters: {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: [
              'open_vscode',
              'open_browser',
              'open_spotify',
              'open_github_desktop',
              'volume_up',
              'volume_down',
              'mute_volume',
            ],
          },
        },
        required: ['action'],
      },
    },
    handler: runDesktopAction,
  },
}

export const toolDeclarations = Object.values(capabilityRegistry).map(
  (capability) => capability.declaration,
)

export async function executeTool(name, args = {}) {
  const capability = capabilityRegistry[name]
  if (!capability) throw new Error('Unknown capability: ' + name)
  return capability.handler(args)
}

export function listCapabilities() {
  return Object.keys(capabilityRegistry)
}
