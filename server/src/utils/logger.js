const LEVELS = { debug: 10, info: 20, warn: 30, error: 40 }

const SENSITIVE_PATTERN =
  /(access_token|refresh_token|id_token|client_secret|api[_-]?key|session[_-]?secret|authorization)/i

const currentLevel = LEVELS[process.env.LOG_LEVEL] ?? LEVELS.info

/**
 * Best-effort redaction for log payloads. Never log tokens or full raw
 * datasets; this is a safety net, not a licence to log secrets.
 */
export function redact(value, depth = 0) {
  if (depth > 4 || value == null) return value
  if (typeof value === 'string') return value.length > 200 ? `${value.slice(0, 200)}…` : value

  if (Array.isArray(value)) return value.map((item) => redact(item, depth + 1))

  if (typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [
        key,
        SENSITIVE_PATTERN.test(key) ? '[redacted]' : redact(entry, depth + 1),
      ]),
    )
  }

  return value
}

function write(level, message, meta) {
  if (LEVELS[level] < currentLevel) return
  const line = `[${new Date().toISOString()}] ${level.toUpperCase()} ${message}`
  const sink = level === 'error' ? console.error : console.log
  if (meta === undefined) sink(line)
  else sink(line, redact(meta))
}

export const logger = {
  debug: (message, meta) => write('debug', message, meta),
  info: (message, meta) => write('info', message, meta),
  warn: (message, meta) => write('warn', message, meta),
  error: (message, meta) => write('error', message, meta),
}
