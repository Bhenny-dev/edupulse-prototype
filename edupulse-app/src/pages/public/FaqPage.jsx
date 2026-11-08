import { BookOpen, BookMarked, Library } from 'lucide-react'
import RoomPage, { Chips, DetailCard } from '../../components/public/RoomPage'
import { FAQ } from '../../components/landing/content'

// Each question as a book on the reading table: a short answer in keywords, the full one a click away.
const SHORT = [
  { topic: 'Sign-in', words: ['Accounts from the admin', 'One role each'] },
  { topic: 'LMS & grades', words: ['No', 'Syllabus layer', 'Grades stay in the KCP sheet'] },
  { topic: 'AI accuracy', words: ['Grounded in your files', 'Sources named', 'You review'] },
  { topic: 'Publishing', words: ['Never by itself', 'Instructors publish'] },
  { topic: 'Assessments', words: ['Never', 'Pulse guides and reminds'] },
  { topic: 'Syllabus approval', words: ['Outside EduPulse', 'Dean · CAO · EVP'] },
  { topic: 'Records', words: ['EduSuite exports', 'Uploaded by the Dean’s office'] },
  { topic: 'Other colleges', words: ['CIT first', 'Others planned'] },
]
const TINTS = ['#2563eb', '#f59e0b', '#10b981', '#ec4899', '#8b5cf6', '#06b6d4', '#ef4444', '#84cc16']
const ITEMS = FAQ.map((_, i) => ({ key: `q${i}`, short: SHORT[i].topic, icon: BookOpen, tint: TINTS[i] }))

function detail(key) {
  const i = Number(key.slice(1)), item = FAQ[i]
  return (
    <DetailCard icon={BookOpen} tint={TINTS[i]} kicker={`Question ${i + 1} of ${FAQ.length}`} name={item.question} words={SHORT[i].words}>
      <details className="ps-more"><summary>Full answer</summary><p>{item.answer}</p></details>
    </DetailCard>
  )
}

function Shelf() {
  return (
    <div className="ps-shelf">
      {FAQ.map((item, i) => (
        <details key={item.question} className="ps-book" style={{ '--tint': TINTS[i] }}>
          <summary><b>{SHORT[i].topic}</b><span>{item.question}</span></summary>
          <Chips words={SHORT[i].words} />
          <p>{item.answer}</p>
        </details>
      ))}
    </div>
  )
}

export default function FaqPage() {
  return (
    <RoomPage theme="library" room="Library" icon={Library} tint="#7c5230" title="Eight questions, eight books." lead="Pick a book." items={ITEMS} detail={detail}
      sections={[{ id: 'shelf', label: 'The shelf', title: 'Every question', icon: BookMarked, tint: '#2563eb', node: <Shelf /> }]} />
  )
}
