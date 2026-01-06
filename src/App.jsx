import { useState, useCallback } from 'react'
import Editor from '@monaco-editor/react'
import { Play, CheckCircle, XCircle, Clock, Loader2, Terminal, BookOpen, Code2, Zap } from 'lucide-react'
import './App.css'

// Пример задачи
const TASK = {
  id: 1,
  title: "Сумма массива",
  difficulty: "Easy",
  description: `Напишите программу, которая считывает последовательность целых чисел из стандартного ввода и выводит их сумму.

Числа во входных данных разделены пробелами.`,
  inputFormat: "Последовательность целых чисел, разделённых пробелами.",
  outputFormat: "Одно целое число — сумма всех чисел.",
  examples: [
    { input: "1 2 3 4 5", output: "15" },
    { input: "10 20 30", output: "60" },
    { input: "-5 5 10", output: "10" }
  ],
  // Тестовые данные для проверки
  testCases: [
    { input: "1 2 3 4 5", expected: "15" },
    { input: "10 20 30", expected: "60" },
    { input: "100 200 300 400", expected: "1000" }
  ]
}

const INITIAL_CODE = `# Решение задачи: ${TASK.title}
import sys

def main():
    data = sys.stdin.read().split()
    numbers = [int(x) for x in data]
    # Ваш код здесь
    result = sum(numbers)
    print(result)

if __name__ == "__main__":
    main()
`

const BASE_URL = "https://element.mavirico.xyz"
const PYTHON_ID = 71

function App() {
  const [code, setCode] = useState(INITIAL_CODE)
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState(null)
  const [activeTab, setActiveTab] = useState('description')

  const runCode = useCallback(async () => {
    setIsRunning(true)
    setResults(null)

    const testResults = []

    for (const testCase of TASK.testCases) {
      try {
        // Создание submission
        const payload = {
          source_code: btoa(unescape(encodeURIComponent(code))),
          language_id: PYTHON_ID,
          stdin: btoa(testCase.input),
        }

        const response = await fetch(
          `${BASE_URL}/submissions?base64_encoded=true&wait=false`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          }
        )

        const { token } = await response.json()

        // Опрос результата
        let result
        while (true) {
          const res = await fetch(`${BASE_URL}/submissions/${token}?base64_encoded=true`)
          result = await res.json()
          const status = result.status?.description

          if (status !== "In Queue" && status !== "Processing") {
            break
          }
          await new Promise(r => setTimeout(r, 1000))
        }

        const stdout = result.stdout ? decodeURIComponent(escape(atob(result.stdout))).trim() : ''
        const stderr = result.stderr ? decodeURIComponent(escape(atob(result.stderr))).trim() : ''
        const compileOutput = result.compile_output ? decodeURIComponent(escape(atob(result.compile_output))).trim() : ''

        testResults.push({
          input: testCase.input,
          expected: testCase.expected,
          actual: stdout,
          stderr,
          compileOutput,
          passed: stdout === testCase.expected,
          status: result.status?.description,
          time: result.time,
          memory: result.memory
        })
      } catch (error) {
        testResults.push({
          input: testCase.input,
          expected: testCase.expected,
          actual: '',
          error: error.message,
          passed: false,
          status: 'Error'
        })
      }
    }

    setResults(testResults)
    setIsRunning(false)
  }, [code])

  const passedCount = results?.filter(r => r.passed).length || 0
  const totalCount = results?.length || 0

  return (
    <div className="app">
      {/* Header */}
      <header className="header">
        <div className="header-left">
          <div className="logo">
            <Zap className="logo-icon" />
            <span>CodeArena</span>
          </div>
        </div>
        <div className="header-center">
          <span className="task-badge">{TASK.difficulty}</span>
          <h1 className="task-title">{TASK.title}</h1>
        </div>
        <div className="header-right">
          <button 
            className={`run-button ${isRunning ? 'running' : ''}`}
            onClick={runCode}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Loader2 className="icon animate-spin" />
                <span>Выполнение...</span>
              </>
            ) : (
              <>
                <Play className="icon" />
                <span>Запустить</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main content */}
      <main className="main">
        {/* Left panel - Editor */}
        <section className="editor-panel">
          <div className="panel-header">
            <Code2 className="panel-icon" />
            <span>Редактор кода</span>
            <span className="lang-badge">Python 3</span>
          </div>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage="python"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
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
        </section>

        {/* Right panel - Task & Results */}
        <section className="task-panel">
          {/* Tabs */}
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'description' ? 'active' : ''}`}
              onClick={() => setActiveTab('description')}
            >
              <BookOpen className="tab-icon" />
              Условие
            </button>
            <button 
              className={`tab ${activeTab === 'results' ? 'active' : ''}`}
              onClick={() => setActiveTab('results')}
            >
              <Terminal className="tab-icon" />
              Результаты
              {results && (
                <span className={`results-badge ${passedCount === totalCount ? 'success' : 'error'}`}>
                  {passedCount}/{totalCount}
                </span>
              )}
            </button>
          </div>

          {/* Tab content */}
          <div className="tab-content">
            {activeTab === 'description' ? (
              <div className="description-content animate-fade-in">
                <div className="section">
                  <h3>Описание</h3>
                  <p>{TASK.description}</p>
                </div>

                <div className="section">
                  <h3>Формат входных данных</h3>
                  <p>{TASK.inputFormat}</p>
                </div>

                <div className="section">
                  <h3>Формат выходных данных</h3>
                  <p>{TASK.outputFormat}</p>
                </div>

                <div className="section">
                  <h3>Примеры</h3>
                  <div className="examples">
                    {TASK.examples.map((example, idx) => (
                      <div key={idx} className="example">
                        <div className="example-block">
                          <span className="example-label">Ввод</span>
                          <code>{example.input}</code>
                        </div>
                        <div className="example-block">
                          <span className="example-label">Вывод</span>
                          <code>{example.output}</code>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="results-content animate-fade-in">
                {!results ? (
                  <div className="no-results">
                    <Terminal className="no-results-icon" />
                    <p>Запустите код, чтобы увидеть результаты</p>
                  </div>
                ) : (
                  <div className="test-results">
                    {/* Summary */}
                    <div className={`summary ${passedCount === totalCount ? 'success' : 'partial'}`}>
                      {passedCount === totalCount ? (
                        <>
                          <CheckCircle className="summary-icon" />
                          <span>Все тесты пройдены!</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="summary-icon" />
                          <span>Пройдено {passedCount} из {totalCount} тестов</span>
                        </>
                      )}
                    </div>

                    {/* Individual tests */}
                    {results.map((result, idx) => (
                      <div key={idx} className={`test-case ${result.passed ? 'passed' : 'failed'}`}>
                        <div className="test-header">
                          {result.passed ? (
                            <CheckCircle className="test-icon success" />
                          ) : (
                            <XCircle className="test-icon error" />
                          )}
                          <span className="test-title">Тест {idx + 1}</span>
                          {result.time && (
                            <span className="test-time">
                              <Clock className="time-icon" />
                              {result.time}s
                            </span>
                          )}
                        </div>

                        <div className="test-details">
                          <div className="detail-row">
                            <span className="detail-label">Ввод:</span>
                            <code>{result.input}</code>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Ожидалось:</span>
                            <code className="expected">{result.expected}</code>
                          </div>
                          <div className="detail-row">
                            <span className="detail-label">Получено:</span>
                            <code className={result.passed ? 'success' : 'error'}>
                              {result.actual || '(пусто)'}
                            </code>
                          </div>
                          {result.stderr && (
                            <div className="detail-row error-row">
                              <span className="detail-label">Ошибка:</span>
                              <code className="error">{result.stderr}</code>
                            </div>
                          )}
                          {result.compileOutput && (
                            <div className="detail-row error-row">
                              <span className="detail-label">Компиляция:</span>
                              <code className="error">{result.compileOutput}</code>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </main>
    </div>
  )
}

export default App

