import {expect,type Page} from '@playwright/test'
import {createHash} from 'node:crypto'
import {retainedSourcesUI} from './retained-sources-fixture'
import {referenceSnapshotToken} from '../src/lib/rag/syllabusReferences'
export async function citationRepairUI(page:Page){
 const fixture=await retainedSourcesUI(page,false)
 const reference={kind:'book',title:'Anderson, David R., et. al. (1019). An introduction to management science: Quantitative approaches to decision making',url:'',authors:'',year:'',publisher:''}
 fixture.setWorkspace({syllabi:[{...fixture.syllabus,books:[{...reference,title:reference.title.replace(/ making$/,'')},{title:'making'}],onlineReferences:[]}],content:{},registrations:[]})
 await page.route('**/api/ai?action=syllabus-sources',async route=>{
  const body=route.request().postDataJSON()
  if(body.operation!=='read')return route.fallback()
  const ref=body.references[0],text='# Catalog metadata\n\n## An introduction to management science: Quantitative approaches to decision making\n\n**Catalog year:** 2019\n\nThe syllabus year 1019 differs. Verify the edition. No book text was retained.'
  fixture.snapshots.push({id:'99999999-9999-4999-8999-999999999999',reference_key:createHash('sha256').update(referenceSnapshotToken(ref)).digest('hex'),reference:{...ref,title:'An introduction to management science: Quantitative approaches to decision making',authors:'David R. Anderson',year:'',url:'https://openlibrary.org/works/OL18083815W'},url:'https://openlibrary.org/works/OL18083815W',sha256:createHash('sha256').update(text).digest('hex'),name:'catalog-metadata.txt',mime:'text/plain',size:text.length,text,base64:Buffer.from(text).toString('base64'),pages:0,truncated:false,warnings:['The original year 1019 differs from the catalog year 2019. Verify the edition.'],created_at:'2026-11-13T02:00:00.000Z'})
  // The list route reads the same fixture snapshots; immutable-byte behavior is covered natively.
  return route.fulfill({json:{sources:[{reference:ref,key:fixture.snapshots.at(-1).reference_key,status:'retained',metadataOnly:true,snapshot:{...fixture.snapshots.at(-1),versions:1},message:'The original year 1019 differs from the catalog year 2019. Verify the edition.'}]}})
 })
 await page.goto('/#/courseware?course=retained-course')
 const panel=page.locator('.syllabus-sources');await panel.locator('summary').first().click()
 await expect(panel.getByText('Syllabus sources (1)',{exact:true})).toBeVisible()
 await expect(panel.getByText('making',{exact:true})).toHaveCount(0)
 await panel.getByRole('button',{name:'Search and read sources',exact:true}).click()
 await expect(panel).toContainText('1 catalog records')
 await expect(panel).toContainText('metadata only')
 return panel
}
