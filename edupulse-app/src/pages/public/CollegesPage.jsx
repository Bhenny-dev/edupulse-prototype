import { CalendarDays, ExternalLink, Frame, GraduationCap, MapPin, School, Sparkles } from 'lucide-react'
import RoomPage, { Chips, DetailCard } from '../../components/public/RoomPage'
import { COLLEGES, KCP } from '../../data/colleges'
import { STUDENT_PROGRAMS } from '../../data/studentPrograms'

const TINTS = { CIT: '#2563eb', CABM: '#f59e0b', CCJE: '#64748b', COT: '#8b5cf6', CTELA: '#10b981' }
const ITEMS = COLLEGES.map(college => ({ key: college.code.toLowerCase(), short: college.code, icon: GraduationCap, tint: TINTS[college.code] }))
const IMAGES = Object.fromEntries(COLLEGES.map(college => [college.code.toLowerCase(), college.photo]))

// Program names, shortened the way they are said on campus.
const short = name => name
  .replace(/^Bachelor of Science in /, 'BS ')
  .replace(/^Bachelor of Arts in /, 'AB ')
  .replace(/^Bachelor of Secondary Education Major in /, 'BSEd ')
  .replace(/^Bachelor of Elementary Education$/, 'BEEd')
  .replace(/^Bachelor of Technical - Vocational Teacher Education Major in /, 'BTVTEd ')
  .replace(' with Specialization in ', ': ')
  .replace(' Major in ', ': ')
const programs = college => (college.programs || STUDENT_PROGRAMS[college.name] || []).map(short)

function detail(key) {
  const college = COLLEGES.find(entry => entry.code.toLowerCase() === key)
  return (
    <DetailCard icon={GraduationCap} tint={TINTS[college.code]} kicker={college.status === 'active' ? 'Now on EduPulse' : 'Planned'} name={college.name}>
      <img className="ps-emblem" src={college.emblem} alt="" width="56" height="56" />
      <Chips words={programs(college)} tone="soft" />
    </DetailCard>
  )
}

function Offers() {
  return (
    <ul className="ps-offers">
      {COLLEGES.map(college => (
        <li key={college.code} style={{ '--tint': TINTS[college.code] }}>
          <header>
            <img src={college.emblem} alt="" width="44" height="44" loading="lazy" />
            <b>{college.code}</b>
            <span className={`ps-status ${college.status === 'active' ? 'is-on' : ''}`}>{college.status === 'active' ? 'Now serving' : 'Planned'}</span>
          </header>
          <Chips words={programs(college)} tone="soft" />
        </li>
      ))}
    </ul>
  )
}

function Kcp() {
  return (
    <div className="ps-kcp">
      <img src={KCP.crest} alt={`${KCP.name} crest`} width="120" height="120" loading="lazy" />
      <ul>
        <li><CalendarDays size={18} aria-hidden="true" /><b>Founded</b><span>{KCP.founded}</span></li>
        <li><MapPin size={18} aria-hidden="true" /><b>Campus</b><span>{KCP.address}</span></li>
        <li><ExternalLink size={18} aria-hidden="true" /><b>Website</b><a href={KCP.website} target="_blank" rel="noopener noreferrer">kcp.edu.ph</a></li>
      </ul>
    </div>
  )
}

export default function CollegesPage() {
  return (
    <RoomPage theme="gallery" room="Gallery" icon={Frame} tint="#7c3aed" title="Five colleges, CIT first." lead="Tap a picture." items={ITEMS} detail={detail} images={IMAGES}
      sections={[
        { id: 'offers', label: 'Programs', title: 'What each college offers', icon: Sparkles, tint: '#2563eb', node: <Offers /> },
        { id: 'kcp', label: 'KCP', title: KCP.name, icon: School, tint: '#b91c1c', node: <Kcp /> },
      ]} />
  )
}
