import { syllabusBlocks, downloadBlob } from './syllabusFiles'
import { markdownBlocks, printableText } from './markdownBlocks'

// Lazy loading keeps PDF fonts and layout out of the initial application bundle.
// Only text and explicitly constructed styles reach pdfmake: no remote URLs,
// HTML, embedded code, or model-supplied document definitions are executed.
async function renderPdf(content, title, status) {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')])
  pdfMake.addVirtualFileSystem(fonts)
  return pdfMake.createPdf({
    info: { title: printableText(title), creator: 'EduPulse' }, pageSize: 'A4', pageMargins: [44, 44, 44, 52],
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.3, color: '#20334b' },
    content: content.map((node, index) => ({ id: `content-${index}`, ...node })),
    // A heading is never left alone at the bottom of a page.
    pageBreakBefore: (node, container) => node.headlineLevel === 1 && !container.getFollowingNodesOnPage().some(next => next.id?.startsWith('content-') && next.id !== node.id),
    footer: (page, count) => ({ text: `${status}  |  ${page} / ${count}`, alignment: 'center', fontSize: 8, color: '#52657b', margin: [30, 15, 30, 0] }),
  }).getBlob()
}

export async function documentPdf(blocks, title = 'EduPulse document', status = 'Draft - review before use') {
  const nodes = blocks.map(block => ({ text: printableText(block.text), ...(block.heading ? { bold: true, fontSize: 13, margin: [0, 14, 0, 7], headlineLevel: 1 } : { margin: [0, 0, 0, 6] }) }))
  return renderPdf(nodes, title, status)
}
export async function downloadSyllabusPdf(syllabus, filename) {
  const title = `${syllabus.courseCode || 'New'} - ${syllabus.courseTitle || 'Syllabus'}`
  const blob = await documentPdf(syllabusBlocks(syllabus), title, 'Syllabus - complete the institutional review and approval process')
  downloadBlob(blob, filename || `${(syllabus.courseCode || 'syllabus').replace(/[^a-z0-9-]/gi, '_')}.pdf`)
}

/** Builds the PDF content for a generated reply or material: Markdown is laid out, not printed raw. */
export function materialContent(content) {
  const nodes = [{ text: printableText(content.title || 'Pulse learning material'), bold: true, fontSize: 18, color: '#14263f', margin: [0, 0, 0, 4] }]
  if (content.subtitle) nodes.push({ text: printableText(content.subtitle), color: '#52657b', margin: [0, 0, 0, 12] })
  for (const section of content.sections || []) nodes.push({ text: printableText(section.heading), bold: true, fontSize: 14, color: '#14263f', margin: [0, 14, 0, 7], headlineLevel: 1 }, ...markdownBlocks(section.body))
  if (content.text) nodes.push(...markdownBlocks(content.text))
  if (content.sources?.length) {
    nodes.push({ text: 'Sources', bold: true, fontSize: 13, color: '#14263f', margin: [0, 16, 0, 6], headlineLevel: 1 })
    nodes.push({ stack: content.sources.map((source, index) => ({ text: printableText(`[${source.citation || index + 1}] ${[source.title, source.page ? `Page ${source.page}` : '', source.url].filter(Boolean).join(' - ')}`), fontSize: 9 })), margin: [0, 0, 0, 6] })
  }
  return nodes
}
export async function downloadMaterialPdf(content) {
  const blob = await renderPdf(materialContent(content), content.title || 'Pulse learning material', 'Draft - review before use')
  downloadBlob(blob, `${(content.title || 'pulse-material').replace(/[^a-z0-9 _-]/gi, '').slice(0, 80)}.pdf`)
}
