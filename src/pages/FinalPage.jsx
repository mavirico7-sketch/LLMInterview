import { useState, useEffect, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import { Zap, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import './FinalPage.css'
import {
  loadSessionState,
  normalizeSessionState,
  saveSessionState,
  phaseIndex,
} from '../utils/sessionStore'

const INTERVIEW_API_URL = import.meta.env.VITE_INTERVIEW_API_URL || '/api/v1/interview'

const isPhaseAvailable = (currentPhase, targetPhase) =>
  phaseIndex(currentPhase) >= phaseIndex(targetPhase)

export default function FinalPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [sessionState, setSessionState] = useState(() => loadSessionState(sessionId))
  const [isStarting, setIsStarting] = useState(false)
  const [error, setError] = useState(null)

  const { messagesByPhase, phase, sessionInfo } = sessionState
  const currentPage = 'final'
  const finalMessages = messagesByPhase.final || []

  const updateSessionState = useCallback(
    (updater) => {
      setSessionState((prev) => {
        const nextState =
          typeof updater === 'function' ? updater(prev) : { ...prev, ...updater }
        return normalizeSessionState(nextState, sessionId)
      })
    },
    [sessionId],
  )

  useEffect(() => {
    setSessionState(loadSessionState(sessionId))
  }, [sessionId])

  useEffect(() => {
    saveSessionState(sessionId, sessionState)
  }, [sessionId, sessionState])

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`${INTERVIEW_API_URL}/sessions/${sessionId}`)
        if (!response.ok) throw new Error('Session not found')
        const data = await response.json()
        const nextFinalMessages = data.display_messages?.final || []

        updateSessionState((prev) => ({
          ...prev,
          sessionInfo: data.init_info || data,
          phase: data.phase || prev.phase,
          messagesByPhase: {
            ...prev.messagesByPhase,
            interview: data.display_messages?.interview || prev.messagesByPhase?.interview || [],
            live_coding: data.display_messages?.live_coding || prev.messagesByPhase?.live_coding || [],
            final: nextFinalMessages.length > 0 ? nextFinalMessages : prev.messagesByPhase?.final || [],
          },
        }))

        if (phaseIndex(data.phase) < phaseIndex('final')) {
          if (data.phase === 'interview') {
            navigate(`/interview/${sessionId}`)
          } else {
            navigate(`/coding/${sessionId}`)
          }
          return
        }

        if (data.phase === 'final' && nextFinalMessages.length === 0) {
          startFinalSummary()
        }
      } catch (err) {
        setError('Failed to load session')
      }
    }

    fetchSession()
  }, [sessionId])

  const startFinalSummary = async () => {
    if (isStarting) return
    setIsStarting(true)
    try {
      const response = await fetch(`${INTERVIEW_API_URL}/sessions/${sessionId}/final/start`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to start final summary')

      const data = await response.json()
      const content = data.content || ''

      updateSessionState((prev) => ({
        ...prev,
        phase: data.phase || prev.phase,
        messagesByPhase: content
          ? {
              ...prev.messagesByPhase,
              final: [...(prev.messagesByPhase?.final || []), { role: 'assistant', content }],
            }
          : prev.messagesByPhase,
      }))
    } catch (err) {
      setError(err.message)
    } finally {
      setIsStarting(false)
    }
  }

  if (error && !sessionInfo) {
    return (
      <div className="final-page">
        <div className="error-container">
          <AlertCircle className="error-icon" />
          <h2>Session Error</h2>
          <p>{error}</p>
          <button onClick={() => navigate('/')} className="back-button">
            Start New Interview
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="final-page">
      <header className="final-header">
        <div className="header-left">
          <div className="logo" onClick={() => navigate('/')}>
            <Zap className="logo-icon" />
            <span>InterviewAI</span>
          </div>
        </div>
        <div className="header-center">
          {sessionInfo && (
            <div className="session-info">
              <span className="position-badge">{sessionInfo.vacancy}</span>
              <span className="level-badge">{sessionInfo.level}</span>
            </div>
          )}
          <div className="phase-nav">
            <button
              className={`phase-tab ${currentPage === 'interview' ? 'active' : ''}`}
              onClick={() => navigate(`/interview/${sessionId}`)}
            >
              Interview
            </button>
            <button
              className={`phase-tab ${currentPage === 'live_coding' ? 'active' : ''}`}
              disabled={!isPhaseAvailable(phase, 'live_coding')}
              onClick={() => navigate(`/coding/${sessionId}`)}
            >
              Live Coding
            </button>
            <button
              className={`phase-tab ${currentPage === 'final' ? 'active' : ''}`}
              disabled={!isPhaseAvailable(phase, 'final')}
              onClick={() => navigate(`/final/${sessionId}`)}
            >
              Final
            </button>
          </div>
        </div>
        <div className="header-right">
          <div className="phase-indicator final">
            <CheckCircle2 className="phase-icon" />
            Final Summary
          </div>
        </div>
      </header>

      <main className="final-content">
        <section className="summary-card">
          <h2>Interview Summary</h2>
          {isStarting ? (
            <div className="summary-loading">
              <Loader2 className="summary-spinner animate-spin" />
              <p>Generating final summary...</p>
            </div>
          ) : finalMessages.length === 0 ? (
            <p className="summary-placeholder">
              The final summary will appear here once the interview finishes.
            </p>
          ) : (
            <div className="summary-messages">
              {finalMessages.map((message, index) => (
                <div key={index} className={`summary-message ${message.role}`}>
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="summary-card">
          <h3>Session Details</h3>
          <div className="summary-details">
            <div>
              <span className="detail-label">Position</span>
              <span className="detail-value">{sessionInfo?.vacancy || '—'}</span>
            </div>
            <div>
              <span className="detail-label">Level</span>
              <span className="detail-value">{sessionInfo?.level || '—'}</span>
            </div>
            <div>
              <span className="detail-label">Stack</span>
              <span className="detail-value">{sessionInfo?.stack || '—'}</span>
            </div>
            <div>
              <span className="detail-label">Language</span>
              <span className="detail-value">{sessionInfo?.language || '—'}</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  )
}

