import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'

// One answer open at a time. The answer's height animates through grid rows;
// a closed answer is hidden from assistive technology with `visibility`.
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
                <ChevronDown size={20} aria-hidden="true" />
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
