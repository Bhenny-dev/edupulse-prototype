import { useState } from 'react'
import { ArrowLeft, Plus, Trash2, Check, Save, RotateCcw } from 'lucide-react'
import { useToast } from '../../context/ToastContext'

/* ─── Assessment Editor / Viewer ───
 * One-pager assessment with 1-5 multiple choice questions.
 * Instructors see editable fields; students see a clean take view.
 */

export default function AssessmentEditor({ content, onBack, isStudent = false, onSave }) {
  const { addToast } = useToast()
  const [questions, setQuestions] = useState(content?.questions || [])
  const [answers, setAnswers] = useState({})
  const [submitted, setSubmitted] = useState(false)

  if (!content) return null

  const updateQuestion = (idx, field, value) => {
    setQuestions(prev => {
      const next = [...prev]
      next[idx] = { ...next[idx], [field]: value }
      return next
    })
  }

  const updateOption = (qIdx, optIdx, value) => {
    setQuestions(prev => {
      const next = [...prev]
      const opts = [...next[qIdx].options]
      opts[optIdx] = { ...opts[optIdx], text: value }
      next[qIdx] = { ...next[qIdx], options: opts }
      return next
    })
  }

  const setCorrectAnswer = (qIdx, optIdx) => {
    setQuestions(prev => {
      const next = [...prev]
      next[qIdx] = { ...next[qIdx], correctIndex: optIdx }
      return next
    })
  }

  const addQuestion = () => {
    if (questions.length >= 5) return
    setQuestions(prev => [...prev, {
      id: `q${prev.length + 1}`,
      text: '',
      options: [
        { label: 'A', text: '' },
        { label: 'B', text: '' },
        { label: 'C', text: '' },
        { label: 'D', text: '' },
      ],
      correctIndex: 0,
    }])
  }

  const removeQuestion = (idx) => {
    if (questions.length <= 1) return
    setQuestions(prev => prev.filter((_, i) => i !== idx))
  }

  const handleStudentAnswer = (qIdx, optIdx) => {
    if (submitted) return
    setAnswers(prev => ({ ...prev, [qIdx]: optIdx }))
  }

  const handleSubmit = () => {
    setSubmitted(true)
  }

  const handleRetake = () => {
    setAnswers({})
    setSubmitted(false)
  }

  const saveEdits = () => {
    if (onSave) onSave(questions)
    addToast('Assessment saved', 'success')
  }

  const score = submitted ? questions.reduce((acc, q, i) => acc + (answers[i] === q.correctIndex ? 1 : 0), 0) : 0

  return (
    <div style={{ background: 'var(--gray-100)', minHeight: '100vh', padding: '24px 0' }}>
      {/* Toolbar */}
      <div style={{
        maxWidth: '850px', margin: '0 auto', padding: '0 24px',
        display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px',
      }}>
        <button className="btn btn-ghost btn-sm" onClick={onBack}>
          <ArrowLeft size={14} /> Back
        </button>
        <div style={{ flex: 1 }} />
        {!isStudent && (
          <button className="btn btn-primary btn-sm" onClick={saveEdits}>
            <Save size={14} /> Save Assessment
          </button>
        )}
        {isStudent && !submitted && (
          <button
            className="btn btn-primary btn-sm"
            onClick={handleSubmit}
            disabled={Object.keys(answers).length < questions.length}
          >
            <Check size={14} /> Submit Answers
          </button>
        )}
      </div>

      {/* A4 Assessment Page */}
      <div className="assessment-page">
        {/* Header */}
        <div className="assessment-header">
          <div className="assessment-institution">King's College of the Philippines</div>
          <div className="assessment-department">College of Information Technology</div>
        </div>

        {/* Title */}
        <h1 className="assessment-title">{content.title}</h1>
        <div className="assessment-subtitle">{content.subtitle}</div>

        {/* Meta info */}
        <div className="assessment-meta">
          <span>Total Points: <strong>{content.totalPoints || questions.length * 10}</strong></span>
          <span>Time Limit: <strong>{content.timeLimit || `${questions.length * 5} minutes`}</strong></span>
          <span>Questions: <strong>{questions.length}</strong></span>
        </div>

        {/* Instructions */}
        <div className="assessment-instructions">
          {content.description || 'Answer all questions. Select the best answer for each question.'}
        </div>

        {/* Questions */}
        <div className="assessment-questions">
          {questions.map((q, qIdx) => (
            <div key={q.id} className="assessment-question">
              <div className="assessment-question-header">
                <span className="assessment-question-number">Question {qIdx + 1}</span>
                {!isStudent && (
                  <button
                    className="btn btn-ghost btn-sm"
                    style={{ padding: '2px 6px', color: 'var(--red-400)' }}
                    onClick={() => removeQuestion(qIdx)}
                    disabled={questions.length <= 1}
                  >
                    <Trash2 size={12} />
                  </button>
                )}
              </div>

              {isStudent ? (
                <div className="assessment-question-text">{q.text}</div>
              ) : (
                <input
                  className="form-input assessment-question-input"
                  value={q.text}
                  onChange={e => updateQuestion(qIdx, 'text', e.target.value)}
                  placeholder="Enter question text..."
                />
              )}

              <div className="assessment-options">
                {q.options.map((opt, optIdx) => {
                  const isSelected = isStudent ? answers[qIdx] === optIdx : q.correctIndex === optIdx
                  const isCorrect = submitted && optIdx === q.correctIndex
                  const isWrong = submitted && answers[qIdx] === optIdx && optIdx !== q.correctIndex

                  return (
                    <div
                      key={optIdx}
                      className={`assessment-option ${isSelected ? 'selected' : ''} ${isCorrect ? 'correct' : ''} ${isWrong ? 'wrong' : ''}`}
                      onClick={() => isStudent ? handleStudentAnswer(qIdx, optIdx) : setCorrectAnswer(qIdx, optIdx)}
                    >
                      <span className="assessment-option-label">{opt.label}</span>
                      {isStudent ? (
                        <span className="assessment-option-text">{opt.text}</span>
                      ) : (
                        <input
                          className="assessment-option-input"
                          value={opt.text}
                          onChange={e => updateOption(qIdx, optIdx, e.target.value)}
                          placeholder={`Option ${opt.label}...`}
                          onClick={e => e.stopPropagation()}
                        />
                      )}
                      {!isStudent && isSelected && (
                        <Check size={14} style={{ color: 'var(--green-500)', marginLeft: 'auto', flexShrink: 0 }} />
                      )}
                      {submitted && isCorrect && (
                        <span className="assessment-option-badge" style={{ background: 'var(--green-100, #dcfce7)', color: 'var(--green-700, #15803d)' }}>Correct</span>
                      )}
                      {isWrong && (
                        <span className="assessment-option-badge" style={{ background: 'var(--red-100, #fee2e2)', color: 'var(--red-700, #b91c1c)' }}>Your answer</span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Add question button (instructor only) */}
        {!isStudent && questions.length < 5 && (
          <button className="btn btn-ghost" style={{ margin: '0 72px 20px' }} onClick={addQuestion}>
            <Plus size={14} /> Add Question ({questions.length}/5)
          </button>
        )}

        {/* Results (student, after submit) */}
        {isStudent && submitted && (
          <div className="assessment-results">
            <div className="assessment-results-score">
              Score: {score} / {questions.length} ({questions.length > 0 ? Math.round((score / questions.length) * 100) : 0}%)
            </div>
            <button className="btn btn-secondary" onClick={handleRetake} style={{ marginTop: '12px' }}>
              <RotateCcw size={14} /> Retake
            </button>
          </div>
        )}

        {/* Footer */}
        <div className="assessment-footer">
          <div>Page 1 of 1</div>
          <div>{content.title} — Assessment</div>
        </div>
      </div>

      <style>{`
        .assessment-page {
          max-width: 850px;
          margin: 0 auto;
          background: var(--white);
          border-radius: var(--radius-lg);
          box-shadow: 0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
          overflow: hidden;
        }
        .assessment-header {
          text-align: center;
          padding: 48px 72px 16px;
          border-bottom: 2px solid var(--gray-800);
        }
        .assessment-institution {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 1.125rem;
          color: var(--gray-900);
        }
        .assessment-department {
          font-size: 0.8125rem;
          color: var(--gray-500);
          margin-top: 2px;
        }
        .assessment-title {
          font-family: var(--font-heading);
          font-weight: 700;
          font-size: 1.25rem;
          color: var(--gray-900);
          text-align: center;
          padding: 24px 72px 0;
          margin: 0;
        }
        .assessment-subtitle {
          text-align: center;
          font-size: 0.8125rem;
          font-weight: 600;
          color: var(--sky-600);
          text-transform: uppercase;
          letter-spacing: 1px;
          padding: 6px 72px 16px;
        }
        .assessment-meta {
          display: flex;
          justify-content: center;
          gap: 24px;
          padding: 0 72px 16px;
          font-size: 0.8125rem;
          color: var(--gray-500);
        }
        .assessment-instructions {
          margin: 0 72px 24px;
          padding: 12px 16px;
          background: var(--sky-50);
          border: 1px solid var(--sky-200);
          border-radius: var(--radius-md);
          font-size: 0.8125rem;
          color: var(--gray-700);
          line-height: 1.6;
        }
        .assessment-questions {
          padding: 0 72px 24px;
        }
        .assessment-question {
          margin-bottom: 24px;
        }
        .assessment-question-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 8px;
        }
        .assessment-question-number {
          font-weight: 700;
          font-size: 0.8125rem;
          color: var(--sky-600);
        }
        .assessment-question-text {
          font-size: 0.875rem;
          font-weight: 600;
          color: var(--gray-900);
          margin-bottom: 10px;
          line-height: 1.5;
        }
        .assessment-question-input {
          width: 100%;
          font-weight: 600;
          margin-bottom: 10px;
        }
        .assessment-options {
          display: flex;
          flex-direction: column;
          gap: 6px;
          padding-left: 16px;
        }
        .assessment-option {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 8px 12px;
          border: 1px solid var(--gray-200);
          border-radius: var(--radius-md);
          cursor: pointer;
          transition: all 0.15s;
          font-size: 0.8125rem;
        }
        .assessment-option:hover {
          border-color: var(--sky-300);
          background: var(--sky-50);
        }
        .assessment-option.selected {
          border-color: var(--sky-400);
          background: var(--sky-50);
        }
        .assessment-option.correct {
          border-color: var(--green-400, #4ade80);
          background: var(--green-50, #f0fdf4);
        }
        .assessment-option.wrong {
          border-color: var(--red-400, #f87171);
          background: var(--red-50, #fef2f2);
        }
        .assessment-option-label {
          width: 24px;
          height: 24px;
          border-radius: 50%;
          background: var(--gray-100);
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.75rem;
          color: var(--gray-600);
          flex-shrink: 0;
        }
        .assessment-option.selected .assessment-option-label {
          background: var(--sky-500);
          color: #fff;
        }
        .assessment-option.correct .assessment-option-label {
          background: var(--green-500, #22c55e);
          color: #fff;
        }
        .assessment-option.wrong .assessment-option-label {
          background: var(--red-500, #ef4444);
          color: #fff;
        }
        .assessment-option-text {
          flex: 1;
          color: var(--gray-700);
        }
        .assessment-option-input {
          flex: 1;
          border: none;
          background: transparent;
          font-size: 0.8125rem;
          color: var(--gray-700);
          outline: none;
          padding: 0;
        }
        .assessment-option-badge {
          font-size: 0.625rem;
          font-weight: 600;
          padding: 2px 6px;
          border-radius: var(--radius-sm);
          flex-shrink: 0;
        }
        .assessment-results {
          margin: 0 72px 24px;
          padding: 16px;
          background: var(--sky-50);
          border: 1px solid var(--sky-200);
          border-radius: var(--radius-md);
          text-align: center;
        }
        .assessment-results-score {
          font-size: 1.125rem;
          font-weight: 700;
          color: var(--sky-600);
        }
        .assessment-footer {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 72px;
          border-top: 1px solid var(--gray-200);
          font-size: 0.6875rem;
          color: var(--gray-400);
        }
        @media print {
          .assessment-page { box-shadow: none; border-radius: 0; max-width: 100%; }
        }
      `}</style>
    </div>
  )
}
