import { useId, useState } from 'react'

// One answer open at a time. The answer's height (grid rows) and opacity change in about
// 240 ms and the plus turns into a minus; a closed answer leaves the accessibility tree
// through `visibility`. The reading surface itself never moves.
export default function FaqList({ items }) {
  const [open, setOpen] = useState(0)
  const id = useId()
  return (
    <div className="faq-list">
      {items.map((item, i) => {
        const expanded = open === i
        return (
          <div key={item.question} className={`faq-item ${expanded ? 'is-open' : ''}`}>
            <h3>
              <button type="button" className="faq-question" id={`${id}-q${i}`} aria-expanded={expanded} aria-controls={`${id}-a${i}`} onClick={() => setOpen(expanded ? -1 : i)}>
                <span>{item.question}</span>
                <span className="faq-icon" aria-hidden="true" />
              </button>
            </h3>
            <div className="faq-answer" id={`${id}-a${i}`} role="region" aria-labelledby={`${id}-q${i}`}>
              <div><p>{item.answer}</p></div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
