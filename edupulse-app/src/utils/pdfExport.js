import { syllabusBlocks, downloadBlob } from './syllabusFiles'

// Lazy loading keeps PDF fonts and layout out of the initial application bundle.
// Only text and explicitly constructed styles reach pdfmake: no remote URLs,
// HTML, embedded code, or model-supplied document definitions are executed.
export async function documentPdf(blocks, title = 'EduPulse document', status = 'Draft - review before use') {
  const [{ default: pdfMake }, { default: fonts }] = await Promise.all([import('pdfmake/build/pdfmake'), import('pdfmake/build/vfs_fonts')])
  pdfMake.addVirtualFileSystem(fonts)
  return pdfMake.createPdf({
    info: { title, creator: 'EduPulse' }, pageSize: 'A4', pageMargins: [44, 44, 44, 52],
    defaultStyle: { font: 'Roboto', fontSize: 10, lineHeight: 1.3, color: '#20334b' },
    content: blocks.map((block, index) => ({ id: `content-${index}`, text: String(block.text || ''), ...(block.heading ? { bold: true, fontSize: 13, margin: [0, 14, 0, 7], headlineLevel: 1 } : { margin: [0, 0, 0, 6] }) })),
    pageBreakBefore: (node, container) => node.headlineLevel === 1 && !container.getFollowingNodesOnPage().some(next => next.id?.startsWith('content-') && next.text?.trim()),
    footer: (page, count) => ({ text: `${status}  |  ${page} / ${count}`, alignment: 'center', fontSize: 8, color: '#52657b', margin: [30, 15, 30, 0] }),
  }).getBlob()
}
export async function downloadSyllabusPdf(syllabus, filename) {
  const title = `${syllabus.courseCode || 'New'} - ${syllabus.courseTitle || 'Syllabus'}`
  const blob = await documentPdf(syllabusBlocks(syllabus), title, 'Syllabus - complete the institutional review and approval process')
  downloadBlob(blob, filename || `${(syllabus.courseCode || 'syllabus').replace(/[^a-z0-9-]/gi, '_')}.pdf`)
}
export async function downloadMaterialPdf(content) {
  const blocks = [{text:content.title || 'Pulse learning material',heading:true}, {text:content.subtitle || ''}, ...(content.sections || []).flatMap(section=>[{text:section.heading,heading:true},{text:section.body}])]
  if(content.text) blocks.push({text:content.text})
  if(content.sources?.length) blocks.push({text:'Sources',heading:true})
  for(const [index,source] of (content.sources || []).entries()) blocks.push({text:`[${source.citation || index+1}] ${[source.title,source.page ? 'Page '+source.page : '',source.url].filter(Boolean).join(' - ')}`})
  downloadBlob(await documentPdf(blocks, content.title), `${(content.title || 'pulse-material').replace(/[^a-z0-9 _-]/gi,'').slice(0,80)}.pdf`)
}
