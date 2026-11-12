import test from 'node:test'
import assert from 'node:assert/strict'
import {referenceLines,parseCitation,repairReferenceEntries} from '../src/utils/referenceParsing.js'
import {collectSyllabusReferences} from '../src/lib/rag/syllabusReferences.js'
import {parseSyllabusText} from '../src/utils/syllabusParser.js'
import {matchingReference,discoverReference} from '../server/sources/discovery.js'
const raw=`Books
Aduana, Nick L. (2021). Management science: a quantitative approach to decision-making
Levine, D. M., et al. (2019). Statistics for Managers Using Microsoft Excel. Pearson.
Anderson, David R., et. al. (1019). An introduction to management science: Quantitative approaches to decision
making
Sirug, W.S. (2015). Basic quantitative methods for business (an intro. to operations research/management science)
Online Reference
Khan Academy - Statistics & Probability - https://www.khanacademy.org/math/statistics-probability
Coursera - Data Analysis with Excel/SPSS -
https://www.coursera.org/search?query=Data%20Analytics%20with%20Excel%2FSPSS
Prepared:
Example author`
test('reference continuations retain full titles, URL associations and boundaries without signatory contamination',()=>{
 const rows=referenceLines(raw);assert.equal(rows.length,6);assert.match(rows[2]!,/decision making$/);assert.match(rows[5]!,/coursera.org\/search/)
 const parsed=rows.map(parseCitation);assert.equal(parsed[1]!.publisher,'Pearson');assert.equal(parsed[1]!.authors,'Levine, D. M., et al.');assert.equal(parsed[2]!.year,'1019','original typo remains visible for verification')
 assert.equal(parsed[5]!.title,'Coursera - Data Analysis with Excel/SPSS');assert(!rows.join().includes('Example author'))
 const syllabus=parseSyllabusText('VIII. REFERENCES\n'+raw).sections[6].parsed
 assert.equal(syllabus.books.length,4);assert.equal(syllabus.onlineReferences.length,2)
 assert.deepEqual(parseCitation('Book title;First Author;2021;Example Press'),{title:'Book title',authors:'First Author',year:'2021',publisher:'Example Press'})
})
test('legacy split entries repair in the read model without mutating saved content or merging independent sources',()=>{
 const books=[{title:'Anderson, David R. (1019). Quantitative approaches to decision'},{title:'making'},{title:'Another Book',authors:'Other Author',year:'2020'},{title:'Learning methods'}]
 const before=JSON.stringify(books),refs=collectSyllabusReferences({books})
 assert.equal(refs.length,3);assert.match(refs[0]!.title,/decision making$/);assert.equal(JSON.stringify(books),before)
 assert.equal(repairReferenceEntries([{title:'Book one'},{title:'independent title'}]).length,2)
})
test('catalog matching requires near-complete title and author agreement and flags edition discrepancies',async()=>{
 const ref={kind:'book' as const,title:'Anderson, David R. (1019). An introduction to management science: Quantitative approaches to decision making',authors:'',year:'',publisher:'',url:''}
 const candidate={title:'An introduction to management science: Quantitative approaches to decision making',authors:['David R. Anderson'],year:2019,venue:'Cengage',url:'https://openlibrary.org/works/OL123W',source:'Open Library' as const,identifier:'OL123W',relevance:null,summary:''}
 assert.equal(matchingReference(ref,[{...candidate,title:'Management theory for beginners'}]),undefined)
 assert.equal(matchingReference(ref,[{...candidate,authors:['Unrelated Author']}]),undefined)
 const result=await discoverReference(ref,new AbortController().signal,async()=>({references:[candidate],status:[]}))
 assert.match(result.warning,/1019 differs/);assert.match(result.warning,/first publication/);assert.equal(result.candidate?.title,candidate.title)
})

test('legacy unlabelled continuation URLs attach only to an identifiable trailing source name',()=>{
 const syllabus={books:[{title:'Coursera - Data Analysis with Excel/SPSS -'}],onlineReferences:[{title:'https://www.coursera.org/search?query=Data',url:'https://www.coursera.org/search?query=Data'}]}
 const before=JSON.stringify(syllabus),refs=collectSyllabusReferences(syllabus)
 assert.equal(refs.length,1);assert.equal(refs[0]!.kind,'link');assert.equal(refs[0]!.title,'Coursera - Data Analysis with Excel/SPSS')
 assert.equal(JSON.stringify(syllabus),before)
})

test('PDF publisher and URL wraps retain complete entries without headings, furniture or merged authors',()=>{
 const raw=`Books\tAlpha, A. (2020). Network methods. United
States of America: Cisco Press Beta, B. (2021). Routing methods,
Companion guide. United States of America: Cisco press Gamma, G. (2022).
rd
Network devices, 3 Edition. Indianapolis, Indiana: John Wiley &
Sons, Inc.
Delta, D. (2023). Programming concepts.
O’Reilly Media.
Online
College of Information Technology
Example Group. (n.d.). Network guide. Retrieved from
https://example.org/network-
guide/
Researcher, R. (2024). Platform study.
Journal of Platforms. Retrieved from https://example.org/doi/10.1080/
17508487.2020.1234567
CIT – Bachelor of Science in Information Technology`
 const rows=referenceLines(raw).map(parseCitation)
 assert.equal(rows.length,6)
 assert.equal(rows[0]!.authors,'Alpha, A.');assert.equal(rows[0]!.publisher,'Cisco Press')
 assert.equal(rows[1]!.authors,'Beta, B.');assert.match(rows[1]!.title,/Routing methods, Companion guide/)
 assert.equal(rows[2]!.title,'Network devices, 3rd Edition');assert.equal(rows[2]!.publisher,'John Wiley & Sons, Inc')
 assert.equal(rows[3]!.publisher,'O’Reilly Media')
 assert.equal(rows[4]!.url,'https://example.org/network-guide/');assert.equal(rows[4]!.authors,'Example Group.')
 assert.equal(rows[5]!.url,'https://example.org/doi/10.1080/17508487.2020.1234567')
})

test('bare publication years, malformed original dates and detached ordinals retain separate source identities',()=>{
 const rows=referenceLines(`Books\nAuthor, A. 2019. Computing methods\n2019. Web methods\nWriter, W. (202). Software methods\nth\nOther, O. (2011). Systems methods, 7 Edition.Prentice Hall`).map(parseCitation)
 assert.equal(rows.length,4);assert.equal(rows[0]!.authors,'Author, A.')
 assert.equal(rows[1]!.title,'Web methods');assert.equal(rows[1]!.authors,'');assert.equal(rows[1]!.year,'2019')
 assert.equal(rows[2]!.year,'202','invalid original date is disclosed, never guessed')
 assert.equal(rows[3]!.title,'Systems methods, 7th Edition');assert.equal(rows[3]!.publisher,'Prentice Hall')
})
