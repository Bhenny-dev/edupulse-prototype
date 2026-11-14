import {test,expect} from '@playwright/test'
import {sourceSelectionScene,teachingAttachmentScene,assessmentFormatsScene,sectionReferenceScene} from '../outline-source-ui'

test('canonical section links are retained and reach generation without stale weekly references',async({page})=>{await sectionReferenceScene(page)})

test('selected generated passage finds retained source, survives reload and explains both in Pulse',async({page})=>{await sourceSelectionScene(page)})
test('instructor can attach teaching content as a retained draft without generation',async({page})=>{await teachingAttachmentScene(page)})
test('seven assessment formats retain their saved instructor-marked response after reload',async({page})=>{await assessmentFormatsScene(page)})


test('multiple section assessments use teaching output and missing generation preserves the existing section',async({page})=>{
 const {retainedSourcesUI}=await import('../retained-sources-fixture')
 const {normalizeOutlineSections,aggregateSections,weekSections}=await import('../../src/utils/outlineSections')
 const fixture=await retainedSourcesUI(page),first=weekSections(normalizeOutlineSections(fixture.syllabus.courseOutline)[0]!)[0]!
 const row=aggregateSections(fixture.syllabus.courseOutline[0]!,[{...first,assessmentTypes:['Multiple choice']},{...first,id:'second-scope',assessmentTypes:['Essay']}])
 fixture.setWorkspace({...fixture.getWorkspace(),syllabi:[{...fixture.syllabus,courseOutline:[row]}]})
 await page.goto('/#/courseware?course=retained-course&week=1')
 await page.locator('[data-week="1"]').getByRole('button',{name:'Generate',exact:true}).click()
 await expect(page.locator('[data-content-id]')).toHaveCount(4,{timeout:30000})
 const before=fixture.getWorkspace().content as Record<string,any>,firstId='gen-assess-retained-course-w1',secondId=firstId+'-2'
 expect(before[firstId].content.outlineSectionId).toBe(first.id);expect(before[secondId].content.questions[0].responseFormat).toBe('essay')
 expect(fixture.generation.filter(input=>input.stepKey.startsWith('assessment')).every(input=>input.generatedTeaching.includes('Network components'))).toBe(true)
 const { [secondId]:_removed,...remaining }=before
 fixture.setWorkspace({...fixture.getWorkspace(),content:remaining});await page.goto('/#/courseware');await page.reload()
 await expect(page.locator('[data-course="retained-course"]')).toContainText('3 of 4 generated')
 await page.locator('[data-course="retained-course"]').getByRole('button',{name:'View',exact:true}).click()
 const calls=fixture.generation.length
 await page.getByRole('button',{name:'Week 1 actions',exact:true}).click();await page.getByRole('menuitem',{name:'Generate missing content',exact:true}).click()
 await expect(page.locator(`[data-content-id="${secondId}"]`)).toBeVisible({timeout:30000})
 expect(fixture.generation.slice(calls).map(input=>input.stepKey)).toEqual(['assessment-2'])
 expect((fixture.getWorkspace().content as Record<string,any>)[firstId]).toEqual(before[firstId])
})
