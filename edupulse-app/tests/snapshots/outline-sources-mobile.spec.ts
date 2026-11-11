import {test} from './fixtures'
import {sourceSelectionScene,teachingAttachmentScene,assessmentFormatsScene} from '../outline-source-ui'
test('mobile selected text finds retained source and explains the basis',async({page})=>{
 const root='../feature-documentation/system-manual/31-retained-syllabus-sources'
 await sourceSelectionScene(page,async name=>{await page.getByRole('dialog',{name:name==='source-popover'?'Source basis for selected passage':'Pulse',exact:true}).screenshot({path:`${root}/mobile-${name}.png`,animations:'disabled'})})
})


test('teaching file attached as a draft without inference',async({page})=>{
 await teachingAttachmentScene(page,async()=>{await page.screenshot({path:'../feature-documentation/system-manual/26-outline-driven-courseware/13-attached-teaching-file-mobile.png',animations:'disabled'})})
})
test('supported assessment formats are saved by the instructor',async({page})=>{
 await assessmentFormatsScene(page,async()=>{await page.screenshot({path:'../feature-documentation/system-manual/28-outline-selectors/assessment-formats-mobile.png',animations:'disabled'})})
})
