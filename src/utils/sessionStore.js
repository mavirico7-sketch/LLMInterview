const STORAGE_PREFIX = 'interview_session_'

export const PHASES = ['interview', 'live_coding', 'final']

const createEmptyMessages = () => ({
  interview: [],
  live_coding: [],
  final: [],
})

const createDefaultState = (sessionId) => ({
  sessionId,
  phase: 'interview',
  messagesByPhase: createEmptyMessages(),
  code: '',
  environmentId: null,
  runOutput: null,
  sessionInfo: null,
})

export const normalizeSessionState = (rawState, sessionId) => {
  const baseState = createDefaultState(sessionId || rawState?.sessionId || '')
  const merged = { ...baseState, ...(rawState || {}) }
  const messagesByPhase = merged.messagesByPhase || createEmptyMessages()

  merged.messagesByPhase = {
    interview: Array.isArray(messagesByPhase.interview) ? messagesByPhase.interview : [],
    live_coding: Array.isArray(messagesByPhase.live_coding) ? messagesByPhase.live_coding : [],
    final: Array.isArray(messagesByPhase.final) ? messagesByPhase.final : [],
  }

  if (!PHASES.includes(merged.phase)) {
    merged.phase = baseState.phase
  }

  if (merged.environmentId === undefined) {
    merged.environmentId = baseState.environmentId
  }

  return merged
}

export const loadSessionState = (sessionId) => {
  if (!sessionId) {
    return createDefaultState('')
  }

  try {
    const stored = localStorage.getItem(`${STORAGE_PREFIX}${sessionId}`)
    if (!stored) {
      return createDefaultState(sessionId)
    }
    return normalizeSessionState(JSON.parse(stored), sessionId)
  } catch (error) {
    return createDefaultState(sessionId)
  }
}

export const saveSessionState = (sessionId, state) => {
  if (!sessionId) return
  localStorage.setItem(`${STORAGE_PREFIX}${sessionId}`, JSON.stringify(state))
}

export const phaseIndex = (phase) => PHASES.indexOf(phase)

