import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import FormPage from './pages/FormPage.jsx'
import InterviewPage from './pages/InterviewPage.jsx'
import LiveCodingPage from './pages/LiveCodingPage.jsx'
import FinalPage from './pages/FinalPage.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<FormPage />} />
        <Route path="/interview/:sessionId" element={<InterviewPage />} />
        <Route path="/coding/:sessionId" element={<LiveCodingPage />} />
        <Route path="/final/:sessionId" element={<FinalPage />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>,
)
