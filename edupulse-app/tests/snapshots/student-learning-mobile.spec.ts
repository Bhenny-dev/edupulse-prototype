import {test,expect} from './fixtures'
import {studentLearningUI,courseContentDialogScene} from '../student-learning-ui'
test('student learning on a phone',async({page})=>{test.setTimeout(90000);await studentLearningUI(page);await page.goto('/#/courseware');await expect(page.getByRole('button',{name:'Open course IT 102',exact:true})).toBeVisible();await page.screenshot({path:'../feature-documentation/system-manual/41-student-learning/06-phone-courses.png',animations:'disabled',fullPage:true})})

test('phone course tabs and full assessment dialog',async({page})=>{await courseContentDialogScene(page,async name=>{if(name==='12-all-assessment-questions')await page.screenshot({path:'../feature-documentation/system-manual/41-student-learning/13-phone-assessment-dialog.png',animations:'disabled',fullPage:false})})})
