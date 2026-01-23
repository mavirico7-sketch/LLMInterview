import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReactMarkdown from 'react-markdown'
import {
  Zap,
  Send,
  Loader2,
  User,
  Bot,
  AlertCircle,
  CheckCircle2,
  Code2,
  ArrowRight,
} from 'lucide-react'
import './InterviewPage.css'
import {
  loadSessionState,
  normalizeSessionState,
  saveSessionState,
  phaseIndex,
} from '../utils/sessionStore'

const INTERVIEW_API_URL = import.meta.env.VITE_INTERVIEW_API_URL || '/api/v1/interview'

const isPhaseAvailable = (currentPhase, targetPhase) =>
  phaseIndex(currentPhase) >= phaseIndex(targetPhase)

export default function InterviewPage() {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const [sessionState, setSessionState] = useState(() => loadSessionState(sessionId))
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStarting, setIsStarting] = useState(true)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const { messagesByPhase, phase, sessionInfo, code } = sessionState
  const currentPage = 'interview'
  const messages = messagesByPhase.interview || []

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

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, scrollToBottom])

  useEffect(() => {
    saveSessionState(sessionId, sessionState)
  }, [sessionId, sessionState])

  const navigateToPhase = useCallback(
    (nextPhase) => {
      if (nextPhase === 'live_coding') {
        navigate(`/coding/${sessionId}`)
      } else if (nextPhase === 'final') {
        navigate(`/final/${sessionId}`)
      }
    },
    [navigate, sessionId],
  )

  // Fetch session info
  useEffect(() => {
    const fetchSession = async () => {
      try {
        const response = await fetch(`${INTERVIEW_API_URL}/sessions/${sessionId}`)
        if (!response.ok) throw new Error('Session not found')
        const data = await response.json()

        const nextMessages = {
          interview: data.display_messages?.interview || [],
          live_coding: data.display_messages?.live_coding || [],
          final: data.display_messages?.final || [],
        }

        updateSessionState((prev) => ({
          ...prev,
          sessionInfo: data.init_info || data,
          phase: data.phase || prev.phase,
          messagesByPhase: {
            ...prev.messagesByPhase,
            ...nextMessages,
          },
        }))

        if (data.phase === 'interview') {
          if (nextMessages.interview.length > 0) {
            setIsStarting(false)
          } else {
            startInterview(data.phase || 'interview')
          }
          return
        }

        setIsStarting(false)
      } catch (err) {
        setError('Failed to load session')
        setIsStarting(false)
      }
    }

    fetchSession()
  }, [sessionId])

  const startInterview = async (currentPhase = phase) => {
    if (currentPhase !== 'interview') {
      setIsStarting(false)
      return
    }

    setIsStarting(true)

    try {
      const response = await fetch(`${INTERVIEW_API_URL}/sessions/${sessionId}/start`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to start interview')

      const data = await response.json()
      const content = data.content || ''
      const messagePhase = currentPhase
      const nextPhase = data.phase || messagePhase

      updateSessionState((prev) => ({
        ...prev,
        phase: nextPhase,
        messagesByPhase: content
          ? {
              ...prev.messagesByPhase,
              [messagePhase]: [
                ...(prev.messagesByPhase?.[messagePhase] || []),
                { role: 'assistant', content },
              ],
            }
          : prev.messagesByPhase,
      }))
          setIsStarting(false)

      if (data.phase_changed && nextPhase !== messagePhase) {
            navigateToPhase(nextPhase)
          }
    } catch (err) {
      setError(err.message)
      setIsStarting(false)
    }
  }

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    updateSessionState((prev) => ({
      ...prev,
      messagesByPhase: {
        ...prev.messagesByPhase,
        interview: [...(prev.messagesByPhase?.interview || []), { role: 'user', content: userMessage }],
      },
    }))
    setIsLoading(true)

    try {
      const response = await fetch(`${INTERVIEW_API_URL}/sessions/${sessionId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: userMessage, current_code: code || '' }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const data = await response.json()
      const content = data.content || ''
      const messagePhase = phase
      const nextPhase = data.phase || messagePhase
      const targetPhase =
        data.phase_changed && nextPhase === 'final' ? 'final' : messagePhase

      if (content) {
            updateSessionState((prev) => ({
              ...prev,
              messagesByPhase: {
                ...prev.messagesByPhase,
            [targetPhase]: [
              ...(prev.messagesByPhase?.[targetPhase] || []),
              { role: 'assistant', content },
                ],
              },
            }))
          }

      updateSessionState({ phase: nextPhase })
          setIsLoading(false)

      if (data.phase_changed && nextPhase !== messagePhase) {
            navigateToPhase(nextPhase)
          }
    } catch (err) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e)
    }
  }

  if (error && !sessionInfo) {
    return (
      <div className="interview-page">
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
    <div className="interview-page">
      <header className="interview-header">
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
          {phase === 'final' ? (
            <div className="results-header">
              <span className="results-label">Interview completed</span>
              <button
                className="results-button"
                onClick={() => navigate(`/final/${sessionId}`)}
              >
                <span>Go to Results</span>
                <ArrowRight className="button-icon" />
              </button>
            </div>
          ) : (
            <div className={`phase-indicator ${phase}`}>
              {phase === 'interview' ? (
                <>
                  <span className="phase-dot"></span>
                  Interview
                </>
              ) : (
                <>
                  <Code2 className="phase-icon" />
                  Live Coding
                </>
              )}
            </div>
          )}
        </div>
      </header>

      <main className="chat-container">
        <div className="messages-wrapper">
          <div className="messages">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`message ${message.role} animate-slide-in`}
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <div className="message-avatar">
                  {message.role === 'user' ? (
                    <User className="avatar-icon" />
                  ) : (
                    <Bot className="avatar-icon" />
                  )}
                </div>
                <div className="message-content">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
              </div>
            ))}

            {(isStarting || isLoading) && (
              <div className="message assistant animate-fade-in">
                <div className="message-avatar">
                  <Bot className="avatar-icon" />
                </div>
                <div className="message-content typing">
                  <div className="typing-indicator">
                    <span></span>
                    <span></span>
                    <span></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <form onSubmit={sendMessage} className="input-container">
          <div className="input-wrapper">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                phase === 'interview'
                  ? 'Type your answer...'
                  : 'Interview phase has ended'
              }
              disabled={isLoading || isStarting || phase !== 'interview'}
              rows={1}
            />
            <button
              type="submit"
              className="send-button"
              disabled={!inputValue.trim() || isLoading || isStarting || phase !== 'interview'}
            >
              {isLoading ? (
                <Loader2 className="send-icon animate-spin" />
              ) : (
                <Send className="send-icon" />
              )}
            </button>
          </div>
          <p className="input-hint">Press Enter to send, Shift+Enter for new line</p>
        </form>
      </main>
    </div>
  )
}

