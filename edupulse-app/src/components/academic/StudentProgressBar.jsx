// A horizontal progress bar with its text (core flow goal G5). Spans only, so it can sit inside a course card button.
export default function StudentProgressBar({ value, total, label, text }) {
  return <span className="monitoring-progress"><progress aria-label={label} value={value} max={Math.max(1, total)} /><span>{text}</span></span>
}
