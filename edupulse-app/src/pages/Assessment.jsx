import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import {
  FileText, CheckCircle,
  Send, Eye, Timer,
  X, ArrowRight, RotateCcw, MessageSquare,
  BarChart3, ChevronRight
} from 'lucide-react'

// Assessments — FLOW_SPEC Phase 4. Students answer published assessments in
// the system; objective items (MCQ / true-false) are auto-scored and recorded
// to the instructor's Student Monitoring page. There is NO gradebook here: EduPulse never
// computes institutional grades (MG/TFG/FG live in the official KCP grading
// sheet, outside the system). Pulse may guide navigation and remind about
// missed items but never answers or hints at assessment content.

const MOCK_ASSESSMENTS = [
  {
    id: 'assess-1', title: 'Week 1 — Recitation & Short Quiz: Programming Basics', course: 'IT 102', topic: 'Introduction to Programming',
    type: 'quiz', totalPoints: 20, timeLimit: 30, attemptsAllowed: 2, dueDate: '2026-07-15T23:59:00',
    status: 'available', questions: [
      { id: 'q1', type: 'multiple_choice', text: 'What is the primary purpose of a variable in programming?', points: 5, options: ['To store data', 'To print output', 'To define functions', 'To create loops'], correct: 0 },
      { id: 'q2', type: 'multiple_choice', text: 'Which of the following is NOT a valid variable name?', points: 5, options: ['my_var', '_count', '2ndValue', 'totalSum'], correct: 2 },
      { id: 'q3', type: 'true_false', text: 'A function can return multiple values.', points: 5, correct: true },
      { id: 'q4', type: 'short_answer', text: 'Write a one-line statement that prints "Hello, World!".', points: 5 },
    ],
  },
  {
    id: 'assess-2', title: 'Week 4 — Conditional Statements: Seatwork & Quiz', course: 'IT 102', topic: 'Control Structures',
    type: 'activity', totalPoints: 30, timeLimit: null, attemptsAllowed: 1, dueDate: '2026-07-18T23:59:00',
    status: 'available', questions: [
      { id: 'q5', type: 'multiple_choice', text: 'Which control structure repeats a block of code?', points: 10, options: ['if', 'else', 'while', 'switch'], correct: 2 },
      { id: 'q6', type: 'short_answer', text: 'Write a for loop that prints numbers 1 to 10.', points: 10 },
      { id: 'q7', type: 'short_answer', text: 'Explain the difference between a while loop and a for loop.', points: 10 },
    ],
  },
  {
    id: 'assess-3', title: 'Week 3 — Variables & Data Types: Quiz', course: 'IT 102', topic: 'Variables and Data Types',
    type: 'activity', totalPoints: 25, timeLimit: null, attemptsAllowed: 1, dueDate: '2026-07-20T23:59:00',
    status: 'available', questions: [
      { id: 'q8', type: 'multiple_choice', text: 'Which primitive type stores true/false values?', points: 5, options: ['Integer', 'Boolean', 'String', 'Float'], correct: 1 },
      { id: 'q9', type: 'true_false', text: 'A constant\'s value can be reassigned after declaration.', points: 5, correct: false },
      { id: 'q10', type: 'short_answer', text: 'Declare a variable named total with an initial value of 42.', points: 5 },
      { id: 'q11', type: 'short_answer', text: 'Explain the difference between local and global scope.', points: 10 },
    ],
  },
]

const MOCK_ATTEMPTS = [
  { assessmentId: 'assess-1', attempt: 1, score: 15, maxScore: 20, submittedAt: '2026-07-10T14:30:00', answers: { q1: 0, q2: 2, q3: true, q4: 'print("Hello, World!")' } },
]

function QuestionRenderer({ question, answer, onAnswer, disabled }) {
  if (question.type === 'multiple_choice') {
    return (
      <div style={{ display: 'grid', gap: 8 }}>
        {question.options.map((opt, i) => (
          <label key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10,
            border: answer === i ? '2px solid var(--sky-500)' : '1.5px solid var(--gray-200)',
            background: answer === i ? 'var(--sky-50)' : '#fff', cursor: disabled ? 'default' : 'pointer', transition: 'all 0.2s' }}>
            <input type="radio" name={question.id} checked={answer === i} onChange={() => onAnswer(i)} disabled={disabled}
              style={{ accentColor: 'var(--sky-500)' }} />
            <span style={{ fontSize: '0.875rem' }}>{opt}</span>
          </label>
        ))}
      </div>
    )
  }
  if (question.type === 'true_false') {
    return (
      <div style={{ display: 'flex', gap: 10 }}>
        {[{ label: 'True', val: true }, { label: 'False', val: false }].map(opt => (
          <label key={opt.label} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, padding: '12px', borderRadius: 10,
            border: answer === opt.val ? '2px solid var(--sky-500)' : '1.5px solid var(--gray-200)',
            background: answer === opt.val ? 'var(--sky-50)' : '#fff', cursor: disabled ? 'default' : 'pointer', transition: 'all 0.2s', fontWeight: 600 }}>
            <input type="radio" name={question.id} checked={answer === opt.val} onChange={() => onAnswer(opt.val)} disabled={disabled}
              style={{ accentColor: 'var(--sky-500)' }} />
            {opt.label}
          </label>
        ))}
      </div>
    )
  }
  return (
    <textarea className="form-input" value={answer || ''} onChange={e => onAnswer(e.target.value)} disabled={disabled}
      placeholder="Type your answer here..." rows={4}
      style={{ fontSize: '0.875rem', resize: 'vertical' }} />
  )
}

export default function Assessment() {
  const { user } = useAuth()
  const { addToast } = useToast()
  const isStudent = user?.role === 'student'

  const navigate = useNavigate()
  const [view, setView] = useState('list') // list | take
  const [selectedAssessment, setSelectedAssessment] = useState(null)
  const [answers, setAnswers] = useState({})
  const [currentQuestion, setCurrentQuestion] = useState(0)
  const [timeLeft, setTimeLeft] = useState(null)
  const [submitted, setSubmitted] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const timerRef = useRef(null)

  const startAssessment = (assess) => {
    setSelectedAssessment(assess)
    setAnswers({})
    setCurrentQuestion(0)
    setSubmitted(false)
    setShowResults(false)
    if (assess.timeLimit) setTimeLeft(assess.timeLimit * 60)
    setView('take')
  }

  const handleSubmit = () => {
    if (timerRef.current) clearInterval(timerRef.current)
    setSubmitted(true)
    setShowResults(true)
    addToast('Assessment submitted successfully!', 'success')
  }

  useEffect(() => {
    if (timeLeft !== null && timeLeft > 0 && !submitted) {
      timerRef.current = setInterval(() => setTimeLeft(prev => {
        if (prev <= 1) { handleSubmit(); return 0 }
        return prev - 1
      }), 1000)
      return () => clearInterval(timerRef.current)
    }
  }, [timeLeft, submitted, handleSubmit])

  const calcScore = () => {
    if (!selectedAssessment) return { score: 0, max: 0 }
    let score = 0
    selectedAssessment.questions.forEach(q => {
      if (q.type === 'multiple_choice' && answers[q.id] === q.correct) score += q.points
      else if (q.type === 'true_false' && answers[q.id] === q.correct) score += q.points
    })
    return { score, max: selectedAssessment.totalPoints }
  }

  const formatTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  if (view === 'take' && selectedAssessment) {
    const q = selectedAssessment.questions[currentQuestion]
    const { score, max } = calcScore()
    return (
      <div style={{ padding: '24px', maxWidth: 800, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, padding: '12px 16px', background: '#fff', borderRadius: 12, boxShadow: 'var(--shadow-3d)' }}>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>{selectedAssessment.title}</h2>
            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{selectedAssessment.course} · Question {currentQuestion + 1} of {selectedAssessment.questions.length}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            {timeLeft !== null && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, background: timeLeft < 300 ? '#FEF2F2' : 'var(--gray-50)', fontWeight: 700, fontSize: '0.9rem', color: timeLeft < 300 ? 'var(--danger)' : 'var(--gray-700)' }}>
                <Timer size={16} /> {formatTime(timeLeft)}
              </div>
            )}
            {!showResults && (
              <button onClick={handleSubmit} className="btn btn-primary btn-sm"><Send size={14} /> Submit</button>
            )}
          </div>
        </div>

        {showResults ? (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-3d)' }}>
            <div style={{ textAlign: 'center', marginBottom: 24 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', border: `4px solid ${score / max >= 0.75 ? 'var(--success)' : score / max >= 0.5 ? 'var(--warning)' : 'var(--danger)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px', fontSize: '1.5rem', fontWeight: 800 }}>
                {score}/{max}
              </div>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 700 }}>{score / max >= 0.75 ? 'Great job!' : score / max >= 0.5 ? 'Keep practicing!' : 'Review the material'}</h3>
              <p style={{ color: 'var(--gray-500)', fontSize: '0.875rem' }}>{Math.round(score / max * 100)}% · {selectedAssessment.questions.length} questions</p>
            </div>
            <div style={{ display: 'grid', gap: 12 }}>
              {selectedAssessment.questions.map((q, i) => {
                const isCorrect = q.type === 'multiple_choice' ? answers[q.id] === q.correct : q.type === 'true_false' ? answers[q.id] === q.correct : null
                return (
                  <div key={q.id} style={{ padding: 14, borderRadius: 10, border: `1.5px solid ${isCorrect === true ? 'var(--success)' : isCorrect === false ? 'var(--danger)' : 'var(--gray-200)'}`, background: isCorrect === true ? '#ECFDF5' : isCorrect === false ? '#FEF2F2' : 'var(--gray-50)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      {isCorrect === true ? <CheckCircle size={16} style={{ color: 'var(--success)' }} /> : isCorrect === false ? <X size={16} style={{ color: 'var(--danger)' }} /> : <MessageSquare size={16} style={{ color: 'var(--gray-400)' }} />}
                      <span style={{ fontWeight: 600, fontSize: '0.85rem' }}>Q{i + 1}: {q.text}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--gray-500)', paddingLeft: 24 }}>
                      Your answer: {typeof answers[q.id] === 'boolean' ? String(answers[q.id]) : String(answers[q.id] ?? 'Not answered')}
                      {q.type !== 'short_answer' && <span> · Correct: {q.type === 'multiple_choice' ? q.options[q.correct] : String(q.correct)}</span>}
                    </div>
                  </div>
                )
              })}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 20 }}>
              <button onClick={() => { setView('list'); setSelectedAssessment(null) }} className="btn btn-secondary btn-sm">Back to Assessments</button>
              {selectedAssessment.attemptsAllowed > MOCK_ATTEMPTS.filter(a => a.assessmentId === selectedAssessment.id).length && (
                <button onClick={() => startAssessment(selectedAssessment)} className="btn btn-primary btn-sm"><RotateCcw size={14} /> Try Again</button>
              )}
            </div>
          </div>
        ) : (
          <div style={{ background: '#fff', borderRadius: 16, padding: 24, boxShadow: 'var(--shadow-3d)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--sky-500)' }}>Question {currentQuestion + 1} · {q.points} pts</span>
              <span style={{ fontSize: '0.75rem', color: 'var(--gray-400)', textTransform: 'capitalize' }}>{q.type.replace('_', ' ')}</span>
            </div>
            <h3 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: 20 }}>{q.text}</h3>
            <QuestionRenderer question={q} answer={answers[q.id]} onAnswer={(val) => setAnswers(prev => ({ ...prev, [q.id]: val }))} disabled={submitted} />
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
              <button onClick={() => setCurrentQuestion(prev => Math.max(0, prev - 1))} disabled={currentQuestion === 0}
                className="btn btn-secondary btn-sm" style={{ opacity: currentQuestion === 0 ? 0.5 : 1 }}>
                <ChevronRight size={14} style={{ transform: 'rotate(180deg)' }} /> Previous
              </button>
              <div style={{ display: 'flex', gap: 4 }}>
                {selectedAssessment.questions.map((_, i) => (
                  <button key={i} onClick={() => setCurrentQuestion(i)}
                    style={{ width: 28, height: 28, borderRadius: 6, border: 'none', fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer',
                      background: i === currentQuestion ? 'var(--sky-500)' : answers[selectedAssessment.questions[i].id] !== undefined ? 'var(--success)' : 'var(--gray-200)',
                      color: i === currentQuestion ? '#fff' : answers[selectedAssessment.questions[i].id] !== undefined ? '#fff' : 'var(--gray-500)' }}>
                    {i + 1}
                  </button>
                ))}
              </div>
              {currentQuestion < selectedAssessment.questions.length - 1 ? (
                <button onClick={() => setCurrentQuestion(prev => prev + 1)} className="btn btn-primary btn-sm">
                  Next <ChevronRight size={14} />
                </button>
              ) : (
                <button onClick={handleSubmit} className="btn btn-primary btn-sm"><Send size={14} /> Submit</button>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <FileText size={28} style={{ color: 'var(--sky-600)' }} />
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700 }}>Assessments</h1>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.9rem' }}>IT 102 — Computer Programming 1 · {MOCK_ASSESSMENTS.length} published assessments</p>
          </div>
        </div>
        {!isStudent && (
          <button onClick={() => navigate('/student-monitoring')} className="btn btn-secondary btn-sm"><BarChart3 size={14} /> Student Monitoring</button>
        )}
      </div>

      <div style={{ display: 'grid', gap: 16 }}>
        {MOCK_ASSESSMENTS.map(assess => {
          const attempt = MOCK_ATTEMPTS.find(a => a.assessmentId === assess.id)
          const isOverdue = new Date(assess.dueDate) < new Date()
          return (
            <div key={assess.id} style={{ background: '#fff', borderRadius: 16, padding: 20, boxShadow: 'var(--shadow-3d)', borderLeft: `4px solid ${isOverdue ? 'var(--danger)' : 'var(--sky-500)'}` }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <h3 style={{ fontSize: '1rem', fontWeight: 700 }}>{assess.title}</h3>
                    <span style={{ padding: '2px 8px', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700, background: assess.type === 'quiz' ? 'var(--purple-100)' : 'var(--sky-100)', color: assess.type === 'quiz' ? 'var(--purple-500)' : 'var(--sky-500)', textTransform: 'capitalize' }}>
                      {assess.type}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 16, fontSize: '0.8rem', color: 'var(--gray-500)' }}>
                    <span>{assess.totalPoints} points</span>
                    {assess.timeLimit && <span><Timer size={12} /> {assess.timeLimit} min</span>}
                    <span>{assess.questions.length} questions</span>
                    <span>Due: {new Date(assess.dueDate).toLocaleDateString()}</span>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  {attempt && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.75rem', color: 'var(--gray-400)' }}>Last score</div>
                      <div style={{ fontWeight: 700, color: attempt.score / attempt.maxScore >= 0.75 ? 'var(--success)' : 'var(--warning)' }}>
                        {attempt.score}/{attempt.maxScore} ({Math.round(attempt.score / attempt.maxScore * 100)}%)
                      </div>
                    </div>
                  )}
                  {isStudent ? (
                    <button onClick={() => startAssessment(assess)} className="btn btn-primary btn-sm">
                      {attempt ? <><RotateCcw size={14} /> Retry</> : <><ArrowRight size={14} /> Start</>}
                    </button>
                  ) : (
                    <button onClick={() => navigate('/student-monitoring')} className="btn btn-secondary btn-sm"><Eye size={14} /> Scores</button>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
