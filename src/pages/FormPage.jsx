import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Briefcase, Layers, Award, Globe, ArrowRight, Loader2 } from 'lucide-react'
import './FormPage.css'

const LEVELS = [
  { value: 'intern', label: 'Intern', description: 'Just starting out' },
  { value: 'junior', label: 'Junior', description: '0-2 years experience' },
  { value: 'middle', label: 'Middle', description: '2-4 years experience' },
  { value: 'senior', label: 'Senior', description: '4-7 years experience' },
  { value: 'lead', label: 'Tech Lead', description: '7+ years experience' },
  { value: 'principal', label: 'Principal', description: 'Expert level' },
]

const INTERVIEW_API_URL = import.meta.env.VITE_INTERVIEW_API_URL || '/api/v1/interview'

export default function FormPage() {
  const navigate = useNavigate()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)
  const [formData, setFormData] = useState({
    vacancy: '',
    stack: '',
    level: 'middle',
    language: 'English'
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`${INTERVIEW_API_URL}/sessions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (!response.ok) {
        throw new Error('Failed to create session')
      }

      const data = await response.json()
      navigate(`/interview/${data.session_id || data._id}`)
    } catch (err) {
      setError(err.message || 'Something went wrong')
      setIsSubmitting(false)
    }
  }

  return (
    <div className="form-page">
      <div className="form-background">
        <div className="bg-gradient bg-gradient-1"></div>
        <div className="bg-gradient bg-gradient-2"></div>
        <div className="bg-gradient bg-gradient-3"></div>
      </div>

      <header className="form-header">
        <div className="logo">
          <Zap className="logo-icon" />
          <span>InterviewAI</span>
        </div>
      </header>

      <main className="form-main">
        <div className="form-container animate-fade-in">
          <div className="form-intro">
            <h1>Start Your Interview</h1>
            <p>Configure your mock interview session. Our AI interviewer will adapt questions based on your experience level and tech stack.</p>
          </div>

          <form onSubmit={handleSubmit} className="interview-form">
            <div className="form-group">
              <label htmlFor="vacancy">
                <Briefcase className="field-icon" />
                Position
              </label>
              <input
                type="text"
                id="vacancy"
                name="vacancy"
                value={formData.vacancy}
                onChange={handleChange}
                placeholder="e.g., Backend Developer, Full Stack Engineer"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="stack">
                <Layers className="field-icon" />
                Tech Stack
              </label>
              <input
                type="text"
                id="stack"
                name="stack"
                value={formData.stack}
                onChange={handleChange}
                placeholder="e.g., Python, FastAPI, PostgreSQL, Redis"
                required
              />
            </div>

            <div className="form-group">
              <label>
                <Award className="field-icon" />
                Experience Level
              </label>
              <div className="level-grid">
                {LEVELS.map((level) => (
                  <button
                    key={level.value}
                    type="button"
                    className={`level-option ${formData.level === level.value ? 'selected' : ''}`}
                    onClick={() => setFormData(prev => ({ ...prev, level: level.value }))}
                  >
                    <span className="level-label">{level.label}</span>
                    <span className="level-description">{level.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="language">
                <Globe className="field-icon" />
                Interview Language
              </label>
              <select
                id="language"
                name="language"
                value={formData.language}
                onChange={handleChange}
              >
                <option value="English">English</option>
                <option value="Russian">Russian</option>
                <option value="Spanish">Spanish</option>
                <option value="German">German</option>
                <option value="French">French</option>
                <option value="Chinese">Chinese</option>
              </select>
            </div>

            {error && (
              <div className="form-error">
                {error}
              </div>
            )}

            <button
              type="submit"
              className="submit-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="button-icon animate-spin" />
                  <span>Starting Interview...</span>
                </>
              ) : (
                <>
                  <span>Begin Interview</span>
                  <ArrowRight className="button-icon" />
                </>
              )}
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

