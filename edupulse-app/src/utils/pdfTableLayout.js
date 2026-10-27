// PDF text order is not table order. Use the document's ruled cell boundaries;
// never infer a missing cell from neighbouring text or a model response.
/** @typedef {{str?: string, transform?: number[], width?: number}} PdfItem */
/** @typedef {{number: number, items: PdfItem[], edges: number[][], rules?: number[][]}} LayoutPage */
/** @param {PdfItem[]} items */
export function pdfLines(items) {
  /** @type {{y:number,cells:{x:number,end:number,text:string}[]}[]} */
  const rows = []
  for (const item of items) {
    if (!item.str?.trim() || !item.transform) continue
    const x = item.transform[4], y = item.transform[5]
    let row = rows.find(row => Math.abs(row.y - y) < 2)
    if (!row) { row = { y, cells: [] }; rows.push(row) }
    row.cells.push({ x, end: x + (item.width || 0), text: item.str })
  }
  return rows.sort((a, b) => b.y - a.y).map(row => ({ ...row, text: row.cells.sort((a,b) => a.x-b.x).map((cell,i,cells) => `${i && cell.x-cells[i-1].end > 18 ? '\t' : i && cell.x-cells[i-1].end > 1 ? ' ' : ''}${cell.text}`).join('').trim() }))
}
/** @param {LayoutPage[]} pages */
export function readRuledOutline(pages) {
  /** @type {{edges:number[],labels:string[]}|null} */
  let columns = null
  let active = false
  const records = [], warnings = []
  for (const page of pages) {
    const lines = pdfLines(page.items)
    const header = lines.find(line => /\bweek\b/i.test(line.text) && /contents?|topics?/i.test(line.text) && /outcomes?/i.test(line.text))
    if (header) {
      const edges = page.edges.filter(edge => edge[1] < header.y && edge[3] > header.y).map(edge => edge[0]).sort((a,b)=>a-b)
      const unique = edges.filter((x,i)=>!i || x-edges[i-1]>2)
      const labels = unique.slice(0,-1).map((x,i)=>header.cells.filter(cell=>cell.x>=x-1&&cell.x<unique[i+1]-1).map(cell=>cell.text).join(' '))
      if (labels.length >= 5 && labels.some(label=>/^week$/i.test(label.trim()))) {
        columns = { edges: unique, labels }; active = true
      }
    }
    if (!active || !columns) continue
    const table = columns
    const stop = lines.find(line => /^(?:VI\.?|6[.)])\s*Course\s+Requirements/i.test(line.text))
    const outer = page.edges.filter(edge=>Math.abs(edge[0]-table.edges[0])<2 && (!header || edge[3]<header.y) && (!stop || edge[1]>stop.y))
    const bands = outer.sort((a,b)=>b[3]-a[3]).filter((edge,i,all)=>!i || Math.abs(edge[1]-all[i-1][1])>2)
    for (const band of bands) {
      const inRow = page.items.filter(item=>item.str?.trim()&&item.transform&&item.transform[5]>band[1]-1&&item.transform[5]<band[3]+1)
      const cells = table.edges.slice(0,-1).map((x,i)=>pdfLines(inRow.filter(item=>item.transform&&item.transform[4]>=x-1&&item.transform[4]<table.edges[i+1]-1)).map(line=>line.text).join('\n'))
      /** @param {RegExp} pattern */
      const index = pattern=>table.labels.findIndex(label=>pattern.test(label))
      const weekCell = cells[index(/^week$/i)].replace(/\s+/g,' ').trim()
      const match = weekCell.match(/^(?:Week\s*)?(\d{1,2})(?:\s*[-\u2013]\s*(\d{1,2}))?$/i)
      const exam = pdfLines(inRow).map(line=>line.text).join(' ').match(/^Week\s*(\d{1,2})\s*:\s*(.+Examination)/i)
      if (exam) { records.push({ weeks:[Number(exam[1])], cells:['',exam[2],'',exam[2]], pages:[page.number] }); continue }
      const values = [/learning outcome|\bilo/i,/contents?|topics?/i,/activit|\btla/i,/assessment|evaluation/i].map(pattern=>cells[index(pattern)]||'')
      if (match) {
        const start=Number(match[1]), end=Number(match[2]||match[1])
        if(start<1||end>52||end<start) { warnings.push(`Review the week range on page ${page.number}.`); continue }
        records.push({ weeks:Array.from({length:end-start+1},(_,i)=>start+i), cells:values, pages:[page.number] })
      } else if (!weekCell && records.length && values.some(Boolean)) {
        const previous=records[records.length-1]
        if (!previous) continue
        previous.cells=previous.cells.map((cell,i)=>[cell,values[i]].filter(Boolean).join('\n'))
        previous.pages.push(page.number)
      } else if (values.some(Boolean)) warnings.push(`An outline row on page ${page.number} needs manual week mapping.`)
    }
    if (stop) active=false
  }
  const byWeek=new Map()
  for(const record of records) for(const week of record.weeks) {
    const [rawIlos,content,activities,assessments]=record.cells
    const ilos=rawIlos.replace(/\n/g,' ')
    // Keep wrapped lines together; split only at an explicit new list marker.
    const topics=content.replace(/\n(?!\s*(?:[a-z]|[ivxlcdm]+)[.)]\s)/gi,' ').split('\n').filter(Boolean)
    const prior=byWeek.get(week)
    if(prior) { prior.ilos=[prior.ilos,ilos].filter(Boolean).join('\n');prior.contents.push(...topics);prior.activities=[prior.activities,activities].filter(Boolean).join('\n');prior.assessments=[prior.assessments,assessments].filter(Boolean).join('\n') }
    else byWeek.set(week,{week,ilos,contents:topics,activities,assessments,teachingMaterials:[],assessmentTypes:[],resources:[]})
  }
  return { outline:[...byWeek.values()], warnings, provenance:records.map(record=>({weeks:record.weeks,pages:[...new Set(record.pages)]})) }
}

/** @param {LayoutPage[]} pages */
export function readRuledPolicies(pages) {
  for (const page of pages) {
    const header=pdfLines(page.items).find(line=>/^Course Requirements/.test(line.text)&&/Grading System/.test(line.text)&&/Course Policy/.test(line.text))
    if(!header) continue
    const edges=page.edges.filter(edge=>edge[1]<header.y&&edge[3]>header.y).map(edge=>edge[0]).sort((a,b)=>a-b).filter((x,i,all)=>!i||x-all[i-1]>2)
    if(edges.length!==4) continue
    const bands=page.edges.filter(edge=>Math.abs(edge[0]-edges[0])<2&&edge[3]<header.y)
    if(!bands.length) continue
    const bottom=Math.min(...bands.map(edge=>edge[1])), top=Math.max(...bands.map(edge=>edge[3]))
    const cells=edges.slice(0,-1).map((x,i)=>pdfLines(page.items.filter(item=>item.str?.trim()&&item.transform&&item.transform[4]>=x-1&&item.transform[4]<edges[i+1]-1&&item.transform[5]>bottom&&item.transform[5]<top)).map(line=>line.text).join('\n'))
    const gradingLines=pdfLines(page.items.filter(item=>item.str?.trim()&&item.transform&&item.transform[4]>=edges[1]&&item.transform[4]<edges[2]&&item.transform[5]>bottom&&item.transform[5]<top))
    for(let i=1;i<gradingLines.length;i++) {
      const denominator=gradingLines[i], numerator=gradingLines[i-1]
      const rule=page.rules?.some(box=>box[0]>=edges[1]&&box[2]<=edges[2]&&box[1]<numerator.y&&box[1]>denominator.y)
      if(rule&&/^\d+$/.test(denominator.text)&&/=/.test(numerator.text)) {
        cells[1]=cells[1].replace(`${numerator.text}\n${denominator.text}`,numerator.text.replace(/=\s*(.*)/,'= ($1) / '+denominator.text))
      }
    }
    return {courseRequirements:cells[0].split('\n').filter(Boolean),gradingSystem:cells[1],coursePolicy:cells[2].replace(/\n(?!\s*\d+[.)]\s)/g,' ').split('\n').filter(Boolean)}
  }
  return null
}

/** @param {LayoutPage[]} pages */
export function readInstitutionalContext(pages) {
  /** @type {{kind:'kcp'|'cit', edges:number[], y:number}|null} */
  let carried = null
  const raw = { kcp: ['', '', ''], cit: ['', ''] }
  for (const page of pages) {
    const lines = pdfLines(page.items)
    const stop = lines.find(line => /^(?:IV[.)]|4[.)])\s*PROGRAM OUTCOMES/i.test(line.text))
    const headers = lines.filter(line => /Mission/.test(line.text) && /Objectives/.test(line.text) && !/College|VISION|III\./.test(line.text))
    /** @type {{kind:'kcp'|'cit',edges:number[],y:number}[]} */
    const tables = carried ? [{ ...carried, y: Infinity }] : []
    for (const header of headers) {
      const kind = /Vision/.test(header.text) ? 'kcp' : 'cit'
      const edges = page.edges.filter(edge => edge[1] < header.y && edge[3] > header.y).map(edge => edge[0]).sort((a,b)=>a-b).filter((x,i,all)=>!i||x-all[i-1]>2)
      if (edges.length === (kind === 'kcp' ? 4 : 3)) tables.push({ kind, edges, y: header.y })
    }
    for (const table of tables) {
      const bands = page.edges.filter(edge => Math.abs(edge[0]-table.edges[0])<2 && edge[1]<table.y && (!stop || edge[1]>stop.y) && table.edges.slice(1,-1).every(x=>page.edges.some(other=>Math.abs(other[0]-x)<2&&Math.abs(other[1]-edge[1])<2&&Math.abs(other[3]-edge[3])<2))).sort((a,b)=>b[3]-a[3])
      for (const band of bands) table.edges.slice(0,-1).forEach((x,i)=>{
        const text=pdfLines(page.items.filter(item=>item.str?.trim()&&item.transform&&item.transform[4]>=x-1&&item.transform[4]<table.edges[i+1]-1&&item.transform[5]>band[1]&&item.transform[5]<Math.min(band[3],table.y-2))).map(line=>line.text).join('\n')
        raw[table.kind][i] = [raw[table.kind][i], text].filter(Boolean).join('\n')
      })
    }
    carried = stop ? null : tables.at(-1) || carried
  }
  if (!raw.kcp.some(Boolean) && !raw.cit.some(Boolean)) return null
  /** @param {string} value */
  const paragraph = value => value.replace(/\n/g,' ').replace(/\s+/g,' ').trim()
  /** @param {string} value */
  const list = value => value.replace(/\n(?!\s*(?:\d+[.)]|[\u25cf\u2022])\s)/g,' ').split('\n').map(item=>item.replace(/^\s*(?:\d+[.)]|[\u25cf\u2022])\s*/,'').trim()).filter(item=>item&&!/aims to:$/i.test(item))
  const values = pages.flatMap(page=>pdfLines(page.items)).find(line=>/^Core Values:/i.test(line.text))?.text.replace(/^Core Values:\s*/i,'').split(',').map(item=>item.trim()) || []
  return { kcp: { vision: paragraph(raw.kcp[0]), mission: paragraph(raw.kcp[1]), objectives: list(raw.kcp[2]), coreValues: values }, cit: { mission: paragraph(raw.cit[0]), objectives: list(raw.cit[1]) } }
}
