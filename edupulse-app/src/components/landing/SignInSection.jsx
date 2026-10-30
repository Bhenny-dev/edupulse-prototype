import { useRef } from 'react'
import LoginPanel from '../auth/LoginPanel'
import { gsap, useMotion } from './motion'

const ROLE_NAMES = ['Dean', 'Associate Dean', 'Instructor', 'Student', 'System Admin']

// Get started. A rectangular aperture opens the welcome picture once, as the section comes into
// view, so the layout resolves before anyone reaches the form; it finishes at once if anyone does.
// The form is never masked or moved. It is the shared sign-in panel, unchanged.
export default function SignInSection({ photo, emblem }) {
  const ref = useRef(null)
  useMotion(ref, ({ motion }) => {
    if (!motion) return undefined
    const section = ref.current
    const reveal = gsap.fromTo(section.querySelector('.signin-visual'), { clipPath: 'inset(12% 10% 12% 10% round 20px)' }, {
      clipPath: 'inset(0% 0% 0% 0% round 0px)', duration: 0.7, ease: 'expo.out', clearProps: 'clipPath',
      scrollTrigger: { trigger: section, start: 'top 85%', once: true },
    })
    const finish = () => { if (reveal.progress() < 1) { reveal.scrollTrigger?.kill(); reveal.progress(1) } }
    section.addEventListener('focusin', finish)
    section.addEventListener('pointerdown', finish)
    return () => { section.removeEventListener('focusin', finish); section.removeEventListener('pointerdown', finish) }
  })

  return (
    <section id="login" className="lp-section signin is-mist" ref={ref} aria-labelledby="signin-title">
      <div className="lp-wrap">
        <div className="signin-frame">
          <figure className="signin-visual">
            <img src={photo} alt="" loading="lazy" decoding="async" width="720" height="480" />
            <figcaption>
              <img src={emblem} alt="" width="56" height="56" />
              <strong>Welcome to EduPulse</strong>
              <span>Sign in with the account your system administrator created. Your role decides what you see.</span>
              <ul>{ROLE_NAMES.map(role => <li key={role}>{role}</li>)}</ul>
            </figcaption>
          </figure>
          <div className="signin-form">
            <header className="lp-head">
              <p className="lp-label">Get started</p>
              <h2 id="signin-title" data-split>Sign in to EduPulse</h2>
              <p>Use your EduPulse account to continue.</p>
            </header>
            <LoginPanel />
          </div>
        </div>
      </div>
    </section>
  )
}
