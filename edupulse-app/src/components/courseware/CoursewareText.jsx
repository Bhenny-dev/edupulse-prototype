import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { prepareCoursewareMarkdown } from './coursewareMarkdown'
import './coursewareText.css'

const inlineElements = ['strong', 'em', 'del', 'code', 'a', 'br']
const plugins = [remarkGfm]
const components = {
  // Section headings already occupy h2 in the document outline.
  h1: 'h3', h2: 'h3', h3: 'h3', h4: 'h4', h5: 'h5', h6: 'h6',
  a: ({ href, children }) => /^(https?:\/\/|mailto:|#)/i.test(href || '')
    ? <a href={href} target={href.startsWith('#') ? undefined : '_blank'} rel="noreferrer">{children}</a>
    : <span>{children}</span>,
  // Generated content cannot load remote images or tracking pixels.
  img: ({ alt }) => <span>{alt}</span>,
  table: ({ children }) => <div className="courseware-table" role="region" aria-label="Content table" tabIndex={0}><table>{children}</table></div>,
}

/** Safe Markdown display only; editors and saved content retain the original text. */
export default function CoursewareText({ children, inline = false }) {
  const text = prepareCoursewareMarkdown(children)
  const formatted = <Markdown remarkPlugins={plugins} components={components} allowedElements={inline ? inlineElements : undefined} unwrapDisallowed>{text}</Markdown>
  return inline ? <span className="courseware-text courseware-text-inline">{formatted}</span> : <div className="courseware-text">{formatted}</div>
}
