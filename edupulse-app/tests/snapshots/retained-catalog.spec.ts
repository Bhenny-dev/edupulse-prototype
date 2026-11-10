import {test,expect} from './fixtures'
import {retainedSourcesUI} from '../retained-sources-fixture'
import {createHash} from 'node:crypto'
import {referenceSnapshotToken} from '../../src/lib/rag/syllabusReferences'

test('retained sources: old catalog copies are visibly excluded from teaching evidence',async({page})=>{
 const fixture=await retainedSourcesUI(page,false),reference={kind:'link' as const,title:'Previously retained search listing',url:'https://www.coursera.org/search?query=networking',authors:'',year:'',publisher:''}
 fixture.syllabus.onlineReferences.push(reference);fixture.setWorkspace({syllabi:[fixture.syllabus],content:{},registrations:[]})
 const bytes=Buffer.from('<h1>Course search results</h1><p>Search filters and course listings are metadata, not a readable lesson or book chapter.</p>')
 fixture.snapshots.push({id:'11111111-1111-4111-8111-111111111111',reference,reference_key:createHash('sha256').update(referenceSnapshotToken(reference)).digest('hex'),url:reference.url,name:'old-search.html',mime:'text/html',size:bytes.length,text:'Course search results and filters.',base64:bytes.toString('base64'),sha256:createHash('sha256').update(bytes).digest('hex'),pages:0,truncated:false,warnings:[],created_at:'2026-11-09T00:00:00.000Z'})
 await page.goto('/#/courseware?course=retained-course');const panel=page.locator('.syllabus-sources');await panel.locator('summary').click();await expect(panel).toContainText('Saved catalog/search listing - metadata only');await expect(panel).toContainText('Its text is excluded from teaching evidence.')
 await page.setViewportSize({width:1440,height:1200});await panel.scrollIntoViewIfNeeded();await panel.screenshot({path:'../feature-documentation/system-manual/35-reference-intake/07-legacy-catalog.png',animations:'disabled',style:'.app-topbar{position:static !important}'})
})
