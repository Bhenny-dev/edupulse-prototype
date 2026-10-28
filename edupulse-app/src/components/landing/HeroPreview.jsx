import { BookOpen, FileText, BarChart3, CheckCircle2 } from 'lucide-react'
import PulseAvatar from '../pulse/PulseAvatar'

const STATIONS = ['Drafted', 'Checked', 'For approval', 'Active']
const BARS = [62, 78, 70, 88, 81, 93]

// An illustration with sample data, not a screenshot. Every looping animation
// rests on the finished state, which is what a still capture shows.
export default function HeroPreview() {
  return (
    <figure className="hero-preview">
      <div className="hero-preview-stage" aria-hidden="true">
        <div className="hero-card hero-card-syllabus">
          <div className="hero-card-head">
            <span className="hero-card-icon"><BookOpen size={18} /></span>
            <span><strong>IT 102 · Computer Programming 1</strong><small>Syllabus · KCP seven-section format</small></span>
          </div>
          <ol className="hero-stations">
            {STATIONS.map((station, i) => <li key={station} style={{ '--i': i }}><span className="hero-station-dot" />{station}</li>)}
          </ol>
          <p className="hero-card-foot"><CheckCircle2 size={15} /> Section 5 course outline extracted · 18 weeks</p>
        </div>

        <div className="hero-card hero-card-courseware">
          <div className="hero-card-head">
            <span className="hero-card-icon is-violet"><FileText size={18} /></span>
            <span><strong>Week 4 · Conditional statements</strong><small>Generated from the course outline</small></span>
          </div>
          <ul className="hero-drafts">
            {['Learning material', 'Seatwork', 'Quiz'].map((item, i) => <li key={item} style={{ '--i': i }}>{item}<span className="badge badge-draft">Draft</span></li>)}
          </ul>
          <span className="hero-card-action">Review &amp; publish</span>
        </div>

        <div className="hero-card hero-card-scores">
          <div className="hero-card-head">
            <span className="hero-card-icon is-green"><BarChart3 size={18} /></span>
            <span><strong>Class progress</strong><small>Scoring sheet · visualization only</small></span>
          </div>
          <div className="hero-bars">{BARS.map((value, i) => <span key={i} style={{ '--h': `${value}%`, '--i': i }} />)}</div>
          <p className="hero-card-foot">Completed 28 · Missed 4</p>
        </div>

        <div className="hero-pulse">
          <PulseAvatar size={52} expression="cheerful" />
          <p>Three drafts are ready for your review.</p>
        </div>
      </div>
      <figcaption className="hero-preview-caption">
        Illustration · sample data
        <span className="sr-only">: a syllabus moving from Drafted to Active, three courseware drafts waiting for instructor review, a class progress chart, and Pulse offering help.</span>
      </figcaption>
    </figure>
  )
}
