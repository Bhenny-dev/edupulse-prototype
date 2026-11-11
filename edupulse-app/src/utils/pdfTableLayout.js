import {aggregateSections,weekSections} from './outlineSections'
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

/** PDF path bounds use the graphics transform, unlike already-transformed text coordinates.
 * @param {{fnArray:number[],argsArray:any[]}} operators
 * @param {Record<string,number>} OPS
 */
export function pdfPathBoxes(operators, OPS) {
  let matrix=[1,0,0,1,0,0]
  /** @type {number[][]} */
  const stack=[]
  /** @type {number[][]} */
  const boxes=[]
  for(let i=0;i<operators.fnArray.length;i++) {
    const op=operators.fnArray[i],args=operators.argsArray[i]
    if(op===OPS.save)stack.push([...matrix])
    else if(op===OPS.restore)matrix=stack.pop()||[1,0,0,1,0,0]
    else if(op===OPS.transform) {
      const [a,b,c,d,e,f]=matrix,[g,h,j,k,l,m]=args
      matrix=[a*g+c*h,b*g+d*h,a*j+c*k,b*j+d*k,a*l+c*m+e,b*l+d*m+f]
    } else if(op===OPS.constructPath&&args[2]?.length===4) {
      const [x0,y0,x1,y1]=args[2],[a,b,c,d,e,f]=matrix
      const points=[[x0,y0],[x0,y1],[x1,y0],[x1,y1]].map(([x,y])=>[a*x+c*y+e,b*x+d*y+f])
      boxes.push([Math.min(...points.map(p=>p[0])),Math.min(...points.map(p=>p[1])),Math.max(...points.map(p=>p[0])),Math.max(...points.map(p=>p[1]))])
    }
  }
  return boxes
}

/** Adjacent cell borders can be separate PDF paths; join only touching segments at the same y.
 * @param {LayoutPage} page
 */
function horizontalSpans(page) {
  /** @type {number[][]} */
  const spans=[]
  for(const rule of [...(page.rules||[])].sort((a,b)=>b[1]-a[1]||a[0]-b[0])) {
    const prior=spans.find(span=>Math.abs(span[1]-rule[1])<2&&rule[0]<=span[2]+2&&rule[2]>=span[0]-2)
    if(prior){prior[0]=Math.min(prior[0],rule[0]);prior[2]=Math.max(prior[2],rule[2])}
    else spans.push([...rule])
  }
  return spans
}

/** Read paired, ruled header cells without gluing neighbouring fields or losing wrapped titles.
 * @param {LayoutPage[]} pages
 */
export function readCourseInformation(pages) {
  /** @type {{courseCode?:string,courseTitle?:string,periodOffered?:string,academicYear?:string}} */
  const info={}
  for(const page of pages.slice(0,2)) {
    const stop=pdfLines(page.items).find(line=>/^(?:III[.)]|3[.)])\s*VISION|^III[.)]\s*INSTITUTIONAL/i.test(line.text))
    if(!stop)continue
    const ys=[...new Set((page.rules||[]).filter(rule=>rule[1]>stop.y).map(rule=>Math.round(rule[1]*2)/2))].sort((a,b)=>b-a)
    for(let r=0;r<ys.length-1;r++) {
      const top=ys[r],bottom=ys[r+1],middle=(top+bottom)/2
      const xs=page.edges.filter(edge=>edge[1]<middle&&edge[3]>middle).map(edge=>edge[0]).sort((a,b)=>a-b).filter((x,i,all)=>!i||x-all[i-1]>2)
      const cells=xs.slice(0,-1).map((x,i)=>pdfLines(page.items.filter(item=>item.str?.trim()&&item.transform&&item.transform[4]>=x-1&&item.transform[4]<xs[i+1]-1&&item.transform[5]>bottom&&item.transform[5]<top)).map(line=>line.text).join(' ').replace(/\s+/g,' ').trim())
      for(let c=0;c<cells.length;c++) {
        const match=cells[c].match(/^(?:I[.)]\s*)?(Course\s*Code|Course\s*Title|Period\s*Offered)\s*:\s*(.*)$/i)
        if(!match)continue
        const value=match[2]||cells[c+1]||'',key=/code/i.test(match[1])?'courseCode':/title/i.test(match[1])?'courseTitle':'periodOffered'
        if(value&&!/^(?:Course|Period)\b.*:/.test(value))info[key]=value
      }
    }
    if(info.periodOffered) {
      const year=info.periodOffered.match(/\bA\.?\s*Y\.?\s*(\d{4}\s*[-\u2013]\s*\d{4})/i)
      if(year){info.academicYear=year[1];info.periodOffered=info.periodOffered.slice(0,year.index).replace(/[,\s]+$/,'')}
    }
    if(info.courseCode&&info.courseTitle)break
  }
  return info
}

/** Read description/metadata cells before the institutional table, including stacked labels.
 * @param {LayoutPage[]} pages
 */
export function readCourseDetails(pages) {
  /** @type {{description?:string,creditUnits?:number,classification?:string,noOfHours?:number,prerequisites?:string[]}} */
  const details={}
  const label=/^(?:[ivx]+[.)]\s*)?(Course\s*Description|Credit\s*Units|Classification|(?:No\.?\s*of|Number\s*of)\s*Hours|Prerequisites?)(?:\s*:\s*(.*)|\s*)$/i
  for(const page of pages.slice(0,2)) {
    const stop=pdfLines(page.items).find(line=>/^(?:III[.)]|3[.)])\s*(?:VISION|INSTITUTIONAL)/i.test(line.text))
    if(!stop)continue
    const ys=[...new Set((page.rules||[]).filter(rule=>rule[1]>stop.y).map(rule=>Math.round(rule[1]*2)/2))].sort((a,b)=>b-a)
    for(let r=0;r<ys.length-1;r++) {
      const top=ys[r],bottom=ys[r+1],middle=(top+bottom)/2
      const xs=page.edges.filter(edge=>edge[1]<middle&&edge[3]>middle).map(edge=>edge[0]).sort((a,b)=>a-b).filter((x,i,all)=>!i||x-all[i-1]>2)
      const cells=xs.slice(0,-1).map((x,i)=>pdfLines(page.items.filter(item=>item.str?.trim()&&item.transform&&item.transform[4]>=x-1&&item.transform[4]<xs[i+1]-1&&item.transform[5]>bottom&&item.transform[5]<top)))
      for(let c=0;c<cells.length;c++) {
        /** @type {{name:string,inline?:string,y:number}[]} */
        const labels=[]
        for(let i=0;i<cells[c].length;i++)for(let count=1;count<=3&&i+count<=cells[c].length;count++) {
          const match=cells[c].slice(i,i+count).map(line=>line.text).join(' ').match(label)
          if(match){labels.push({name:match[1],inline:match[2],y:cells[c][i].y});i+=count-1;break}
        }
        labels.forEach((field,i)=>{
          const lower=labels[i+1]?.y??bottom
          const value=(field.inline||((cells[c+1]||[]).filter(line=>labels.length===1||(line.y<=field.y+2&&line.y>lower+2)).map(line=>line.text).join(' '))).replace(/\s+/g,' ').trim()
          if(/description/i.test(field.name)){details.description=value;return}
          if(/units|hours/i.test(field.name)) {
            const number=value.match(/\b\d+(?:\.\d+)?\b/)
            if(number)details[/units/i.test(field.name)?'creditUnits':'noOfHours']=Number(number[0])
          }else if(/classification/i.test(field.name)&&value)details.classification=value
          else if(/prerequisite/i.test(field.name))details.prerequisites=value?value.replace(/^(st|nd|rd|th)\s+(\d+)\s+(?=year\b)/i,'$2$1 ').split(/[,;]/).map(part=>part.trim()).filter(Boolean):[]
        })
      }
    }
  }
  return details
}
/** @param {LayoutPage[]} pages */
export function readRuledOutline(pages) {
  /** @type {{edges:number[],labels:string[]}|null} */
  let columns = null
  let active = false
  /** @type {{weeks:number[],cells:string[],pages:number[],examination?:boolean,pending?:boolean}[]} */
  const records = []
  const warnings = []
  /** @type {{cells:string[],pages:number[],edges:number[]}|null} */
  let leading = null
  /** @param {string[]} left @param {string[]} right */
  const combine=(left,right)=>left.map((cell,i)=>[cell,right[i]].filter(Boolean).join('\n'))
  /** @param {string[]} cells @param {number[]} sourcePages */
  const review=(cells,sourcePages)=>warnings.push(`Unnumbered outline content on page ${sourcePages.join(', ')}${cells[1]?`: ${cells[1].replace(/\s+/g,' ').slice(0,120)}`:''}. Review it against the original; no week was inferred.`)
  const flushLeading=()=>{if(leading){review(leading.cells,leading.pages);leading=null}}
  for (const page of pages) {
    const lines = pdfLines(page.items)
    const header = lines.find(line => /\bweek\b/i.test(line.text) && /contents?|topics?/i.test(line.text) && /outcomes?/i.test(line.text))
    if (header) {
      const crossing = page.edges.filter(edge => edge[1] < header.y && edge[3] > header.y)
      const edges = crossing.map(edge => edge[0]).sort((a,b)=>a-b)
      const unique = edges.filter((x,i)=>!i || x-edges[i-1]>2)
      const horizontal=horizontalSpans(page).filter(rule=>rule[0]<=unique[0]+2&&rule[2]>=(unique.at(-1)??Infinity)-2).map(rule=>rule[1])
      const below=horizontal.filter(y=>y<header.y),above=horizontal.filter(y=>y>header.y)
      const bottom=below.length?Math.max(...below):Math.max(...crossing.map(edge=>edge[1])),top=above.length?Math.min(...above):Math.min(...crossing.map(edge=>edge[3]))
      const labels = unique.slice(0,-1).map((x,i)=>pdfLines(page.items.filter(item=>item.str?.trim()&&item.transform&&item.transform[5]>bottom&&item.transform[5]<top&&item.transform[4]>=x-1&&item.transform[4]<unique[i+1]-1)).map(line=>line.text).join(' '))
      if (labels.length >= 5 && labels.some(label=>/^week$/i.test(label.trim()))) {
        columns = { edges: unique, labels }; active = true
      }
    }
    if (!active || !columns) continue
    const table = columns
    const stop = lines.find(line => /^(?:VI\.?|6[.)])\s*(?:Course\b|Requirements\b)/i.test(line.text))
    const side = page.edges.filter(edge=>Math.abs(edge[0]-table.edges[0])<2 && (!stop || edge[3]>stop.y))
    const spans=horizontalSpans(page)
    const horizontal=spans.filter(rule=>rule[0]<=table.edges[1]+2&&rule[2]>=(table.edges.at(-1)??Infinity)-2).map(rule=>rule[1])
    const headerBottom=header?Math.max(...horizontal.filter(y=>y<header.y)):Infinity
    const top=Math.min(headerBottom,Math.max(...side.map(edge=>edge[3]))),bottom=Math.max(stop?.y??-Infinity,Math.min(...side.map(edge=>edge[1])))
    const boundaries=[top,bottom,...horizontal.filter(y=>y>bottom&&y<top)].filter(Number.isFinite).sort((a,b)=>b-a).filter((y,i,all)=>!i||Math.abs(y-all[i-1])>2)
    const bands = horizontal.length?boundaries.slice(0,-1).map((y,i)=>[table.edges[0],boundaries[i+1],table.edges[0],y]):side.filter(edge=>(!header||edge[3]<header.y)&&(!stop||edge[1]>stop.y)).sort((a,b)=>b[3]-a[3]).filter((edge,i,all)=>!i||Math.abs(edge[1]-all[i-1][1])>2)
    let firstData=true
    for (const [bandNumber,band] of bands.entries()) {
      const inRow = page.items.filter(item=>item.str?.trim()&&item.transform&&item.transform[5]>band[1]-1&&item.transform[5]<band[3]+1)
      const cells = table.edges.slice(0,-1).map((x,i)=>pdfLines(inRow.filter(item=>item.transform&&item.transform[4]>=x-1&&item.transform[4]<table.edges[i+1]-1)).map(line=>line.text).join('\n'))
      /** @param {RegExp} pattern */
      const index = pattern=>table.labels.findIndex(label=>pattern.test(label))
      let weekCell = cells[index(/^week$/i)].replace(/\s+/g,' ').trim()
      if(/[-\u2013\u2014]|\bto\b/i.test(weekCell))weekCell=weekCell.replace(/(\d)\s+(?=\d$)/,'$1')
      const match = weekCell.match(/^(?:Week\s*)?(\d{1,2})(?:\s*(?:[-\u2013\u2014]|to)\s*(?:Week\s*)?(\d{1,2}))?$/i)
      const pending=weekCell.match(/^(?:Week\s*)?(\d{1,2})\s*(?:[-\u2013\u2014]|to)\s*(?:Week\s*)?$/i)
      const exam = pdfLines(inRow).map(line=>line.text).join(' ').match(/^Week\s*(\d{1,2})\s*:\s*(.+Examination)/i)
      let values = [/learning outcome|\bilo/i,/contents?|topics?/i,/activit|\btla/i,/assessment|evaluation/i].map(pattern=>cells[index(pattern)]||'')
      if(!weekCell&&!values.slice(1).some(Boolean)&&/^After engaging in each topic,?\s*students (?:must|should) have:\s*$/i.test(values[0].replace(/\s+/g,' ')))continue
      if(!weekCell&&!values[0]&&!values[2]&&!values[3]&&/^(?:[ivxlcdm]+|\d+)[.)]\s*$/i.test(values[1].trim()))continue
      if(!exam&&!weekCell&&!values.some(Boolean))continue
      const wasFirst=firstData;firstData=false
      // Word can place a row's week label on the next page. Join only a bottom
      // fragment to the first data row on that next page, with the same columns.
      const continues=leading&&wasFirst&&page.number===(leading.pages.at(-1)??-Infinity)+1&&leading.edges.length===table.edges.length&&leading.edges.every((x,i)=>Math.abs(x-table.edges[i])<2)
      if(leading&&!continues)flushLeading()
      if(exam){flushLeading();records.push({weeks:[Number(exam[1])],cells:['',exam[2],'',exam[2]],pages:[page.number],examination:true});continue}
      let sourcePages=[page.number]
      if(continues&&leading&&(match||pending)){values=combine(leading.cells,values);sourcePages=[...leading.pages,page.number];leading=null}
      else if(continues&&leading&&!weekCell){
        leading.cells=combine(leading.cells,values);leading.pages.push(page.number)
        if(bandNumber!==bands.length-1||stop)flushLeading()
        continue
      }
      else if(continues&&leading)flushLeading()
      const previous=records.at(-1)
      const continuedEnd=weekCell.match(/^(?:to\s*(?:Week\s*)?|)(\d{1,2})$/i)
      if(previous&&(previous.pending||/^to\b/i.test(weekCell))&&continuedEnd&&page.number-(previous.pages.at(-1)??-Infinity)<=1) {
        const start=previous.weeks[0],end=Number(continuedEnd[1])
        if(start>=1&&end>=start&&end<=52){previous.weeks=Array.from({length:end-start+1},(_,i)=>start+i);previous.cells=previous.cells.map((cell,i)=>[cell,values[i]].filter(Boolean).join('\n'));previous.pages.push(page.number);previous.pending=false;continue}
      }
      if(pending){records.push({weeks:[Number(pending[1])],cells:values,pages:sourcePages,pending:true});continue}
      if (match) {
        const start=Number(match[1]), end=Number(match[2]||match[1])
        if(start<1||end>52||end<start) { warnings.push(`Review the week range on page ${page.number}.`); continue }
        records.push({ weeks:Array.from({length:end-start+1},(_,i)=>start+i), cells:values, pages:sourcePages })
      } else if (!weekCell&&values.some(Boolean)) {
        const boundary=spans.some(rule=>Math.abs(rule[1]-band[3])<2&&rule[0]<=table.edges[0]+2&&rule[2]>=table.edges[1]-2)
        const sectionBoundary=spans.some(rule=>Math.abs(rule[1]-band[3])<2&&rule[0]>table.edges[0]+2&&rule[0]<=table.edges[1]+2&&rule[2]>=(table.edges.at(-1)??Infinity)-2)
        if(previous&&!previous.examination&&previous.pages.at(-1)===page.number&&!boundary&&sectionBoundary&&values[0]&&values[1]){records.push({weeks:[...previous.weeks],cells:values,pages:[page.number]});continue}
        if(previous&&!previous.examination&&((wasFirst&&previous.pages.at(-1)===page.number-1)||!boundary)) {
          previous.cells=combine(previous.cells,values);previous.pages.push(page.number)
        }else if(bandNumber===bands.length-1&&!stop&&page!==pages.at(-1))leading={cells:values,pages:[page.number],edges:[...table.edges]}
        else review(values,[page.number])
      } else if (values.some(Boolean)) review(values,[page.number])
    }
    if (stop) {flushLeading();active=false}
  }
  flushLeading()
  for(const record of records)if(record.pending)warnings.push(`The week range beginning at ${record.weeks[0]} on page ${record.pages.join(', ')} has no readable end. Review the original.`)
  const byWeek=new Map()
  for(const [recordIndex,record] of records.entries()) for(const week of record.weeks) {
    const [rawIlos,content,activities,assessments]=record.cells
    const ilos=rawIlos.replace(/\n/g,' ')
    // Keep wrapped lines together; split only at an explicit new list marker.
    const topics=content.replace(/\n(?!\s*(?:[a-z]|[ivxlcdm]+)[.)]\s)/gi,' ').split('\n').filter(Boolean)
    const prior=byWeek.get(week)
    const section={id:`imported-section-${recordIndex+1}`,ilos,contents:topics,activities,assessments,teachingMaterials:[],assessmentTypes:[],resources:[]}
    if(prior)byWeek.set(week,aggregateSections(prior,[...weekSections(prior),section]))
    else byWeek.set(week,aggregateSections({week},[section]))
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
