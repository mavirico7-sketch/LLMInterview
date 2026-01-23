import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import Editor from '@monaco-editor/react'
import ReactMarkdown from 'react-markdown'
import {
  Play,
  Loader2,
  Code2,
  Zap,
  ArrowLeft,
  ArrowRight,
  Send,
  User,
  Bot,
  AlertCircle,
  CheckCircle2,
  Terminal,
} from 'lucide-react'
import './LiveCodingPage.css'
import {
  loadSessionState,
  normalizeSessionState,
  saveSessionState,
  phaseIndex,
} from '../utils/sessionStore'

const INTERVIEW_API_URL = import.meta.env.VITE_INTERVIEW_API_URL || '/api/v1/interview'
const EXECUTOR_API_URL = import.meta.env.VITE_CODE_EXECUTOR_URL || '/api/v1/code'

const isPhaseAvailable = (currentPhase, targetPhase) =>
  phaseIndex(currentPhase) >= phaseIndex(targetPhase)

export default function LiveCodingPage() {
  const navigate = useNavigate()
  const { sessionId } = useParams()
  const [sessionState, setSessionState] = useState(() => loadSessionState(sessionId))
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStarting, setIsStarting] = useState(true)
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState(null)
  const messagesEndRef = useRef(null)

  const { messagesByPhase, phase, sessionInfo, code, runOutput, environmentId } = sessionState
  const currentPage = 'live_coding'
  const messages = messagesByPhase.live_coding || []

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
      if (nextPhase === 'final') {
        navigate(`/final/${sessionId}`)
      }
    },
    [navigate, sessionId],
  )

  const refreshSession = useCallback(
    async (startIfEmpty = true) => {
      try {
        const response = await fetch(`${INTERVIEW_API_URL}/sessions/${sessionId}`)
        if (!response.ok) throw new Error('Session not found')
        const data = await response.json()

        const nextMessages = {
          interview: data.display_messages?.interview || [],
          live_coding: data.display_messages?.live_coding || [],
          final: data.display_messages?.final || [],
        }

        const nextCodeState = data.live_coding?.code_state?.code
        const nextInitialCode = data.live_coding?.current_challenge?.initial_code
        const nextEnvironmentId = data.live_coding?.environment?.id || null

        updateSessionState((prev) => ({
          ...prev,
          sessionInfo: data.init_info || data,
          phase: data.phase || prev.phase,
          code:
            typeof nextCodeState === 'string'
              ? nextCodeState
              : typeof nextInitialCode === 'string'
                ? nextInitialCode
                : prev.code,
          runOutput:
            typeof nextCodeState === 'string' || typeof nextInitialCode === 'string'
              ? null
              : prev.runOutput,
          environmentId: nextEnvironmentId ?? prev.environmentId,
          messagesByPhase: {
            ...prev.messagesByPhase,
            ...nextMessages,
          },
        }))

        if (phaseIndex(data.phase) < phaseIndex('live_coding')) {
          navigate(`/interview/${sessionId}`)
          return
        }

        if (startIfEmpty && data.phase === 'live_coding' && nextMessages.live_coding.length === 0) {
          startLiveCoding(data.phase)
          return
        }

        setIsStarting(false)
      } catch (err) {
        setError('Failed to load session')
        setIsStarting(false)
      }
    },
    [navigate, sessionId, updateSessionState],
  )

  useEffect(() => {
    refreshSession()
  }, [refreshSession])

  const sendMessage = async (e) => {
    e.preventDefault()
    if (!inputValue.trim() || isLoading) return

    const userMessage = inputValue.trim()
    setInputValue('')
    updateSessionState((prev) => ({
      ...prev,
      messagesByPhase: {
        ...prev.messagesByPhase,
        live_coding: [
          ...(prev.messagesByPhase?.live_coding || []),
          { role: 'user', content: userMessage },
        ],
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
          refreshSession(false)
    } catch (err) {
      setError(err.message)
      setIsLoading(false)
    }
  }

  const startLiveCoding = async (currentPhase = phase) => {
    if (currentPhase !== 'live_coding') {
      setIsStarting(false)
      return
    }

    setIsStarting(true)

    try {
      const response = await fetch(`${INTERVIEW_API_URL}/sessions/${sessionId}/live_coding/start`, {
        method: 'POST',
      })

      if (!response.ok) throw new Error('Failed to start live coding')

      const data = await response.json()
      const content = data.content || ''
      const messagePhase = 'live_coding'
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
          setIsStarting(false)
      if (data.phase_changed && nextPhase !== messagePhase) {
            navigateToPhase(nextPhase)
          }
          refreshSession(false)
    } catch (err) {
      setError(err.message)
      setIsStarting(false)
    }
  }

  const runCode = useCallback(async () => {
    setIsRunning(true)
    setError(null)

    try {
      const response = await fetch(`${EXECUTOR_API_URL}/execute`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          environment: environmentId || 'python',
          code: code || '',
          stdin: '',
          filename: 'main.py',
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to run code')
      }

      const result = await response.json()
      updateSessionState({
        runOutput: {
          stdout: result.stdout || '',
          stderr: result.stderr || '',
          status: result.status,
          executionTime: result.execution_time,
          exitCode: result.exit_code,
        },
      })
    } catch (err) {
      updateSessionState({
        runOutput: {
          stdout: '',
          stderr: err.message,
          status: 'error',
          executionTime: null,
          exitCode: null,
        },
      })
    } finally {
      setIsRunning(false)
    }
  }, [code, environmentId, updateSessionState])

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(e)
    }
  }

  if (error && !sessionInfo) {
    return (
      <div className="coding-page">
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
    <div className="coding-page">
      <header className="header">
        <div className="header-left">
          <button className="back-button" onClick={() => navigate('/')}>
            <ArrowLeft className="back-icon" />
          </button>
          <div className="logo">
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
            <button
              className={`run-button ${isRunning ? 'running' : ''}`}
              onClick={runCode}
              disabled={isRunning}
            >
              {isRunning ? (
                <>
                  <Loader2 className="icon animate-spin" />
                  <span>Running...</span>
                </>
              ) : (
                <>
                  <Play className="icon" />
                  <span>Run Code</span>
                </>
              )}
            </button>
          )}
        </div>
      </header>

      <main className="main">
        <section className="editor-panel">
          <div className="panel-header">
            <Code2 className="panel-icon" />
            <span>Code Editor</span>
            <span className="lang-badge">Python 3</span>
          </div>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => updateSessionState({ code: value || '' })}
              options={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                minimap: { enabled: false },
                padding: { top: 16, bottom: 16 },
                scrollBeyondLastLine: false,
                smoothScrolling: true,
                cursorBlinking: 'smooth',
                cursorSmoothCaretAnimation: 'on',
                renderLineHighlight: 'all',
                lineNumbers: 'on',
                glyphMargin: false,
                folding: true,
                lineDecorationsWidth: 10,
                lineNumbersMinChars: 3,
              }}
            />
          </div>
          <div className="output-panel">
            <div className="output-header">
              <Terminal className="output-icon" />
              <span>Output</span>
            </div>
            <div className="output-body">
              {!runOutput ? (
                <div className="output-placeholder">Run your code to see output.</div>
              ) : (
                <>
                  <div className="output-row">
                    <span className="output-label">Status:</span>
                    <span className="output-value">
                      {runOutput.status || 'completed'}
                    </span>
                  </div>
                  <div className="output-row">
                    <span className="output-label">Stdout:</span>
                    <pre className="output-box">
                      {runOutput.stdout ? runOutput.stdout : '(empty)'}
                    </pre>
                  </div>
                  <div className="output-row">
                    <span className="output-label">Stderr:</span>
                    <pre className="output-box error">
                      {runOutput.stderr ? runOutput.stderr : '(empty)'}
                    </pre>
                  </div>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="chat-panel">
          <div className="chat-header">
            <CheckCircle2 className="chat-icon" />
            <span>Live Coding Chat</span>
          </div>
          <div className="chat-messages">
            {messages.map((message, index) => (
              <div key={index} className={`message ${message.role}`}>
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
              <div className="message assistant">
                <div className="message-avatar">
                  <Bot className="avatar-icon" />
                </div>
                <div className="message-content">
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
          <form onSubmit={sendMessage} className="chat-input">
            <textarea
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                phase === 'live_coding'
                  ? 'Describe your approach or ask for help...'
                  : 'Live coding phase has ended'
              }
              disabled={isLoading || phase !== 'live_coding'}
              rows={1}
            />
            <button
              type="submit"
              className="send-button"
              disabled={!inputValue.trim() || isLoading || phase !== 'live_coding'}
            >
              {isLoading ? (
                <Loader2 className="send-icon animate-spin" />
              ) : (
                <Send className="send-icon" />
              )}
            </button>
          </form>
        </section>
      </main>
    </div>
  )
}

