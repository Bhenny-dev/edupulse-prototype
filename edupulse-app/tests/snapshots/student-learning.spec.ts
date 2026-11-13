import {test,expect} from './fixtures'
import {studentLearningScene,courseContentDialogScene} from '../student-learning-ui'
test('student learning cards and repeatable practice',async({page})=>{test.setTimeout(90000);await studentLearningScene(page,async name=>{await page.screenshot({path:`../feature-documentation/system-manual/41-student-learning/${name}.png`,animations:'disabled',fullPage:!['03-material-reader','04-practice-questions'].includes(name),style:'.app-topbar,.support-view-banner{position:static !important}'})})})

import {studentLearningUI} from '../student-learning-ui'
test('Admin student view keeps learner actions without the removed panel',async({page})=>{test.setTimeout(60000);await studentLearningUI(page,true);await page.goto('/#/courseware');await page.getByRole('button',{name:'Open course IT 102',exact:true}).click();await expect(page.getByText('Arrays quiz',{exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Return to System Admin',exact:true})).toBeVisible();await page.addStyleTag({content:'.app-topbar,.support-view-banner{position:static !important}'});await page.screenshot({path:'../feature-documentation/system-manual/41-student-learning/09-admin-controls.png',animations:'disabled',fullPage:true,style:'.app-topbar,.support-view-banner{position:static !important}'})})

test('course tabs and all assessment questions in a separate dialog',async({page})=>{await courseContentDialogScene(page,async name=>{await page.screenshot({path:`../feature-documentation/system-manual/41-student-learning/${name}.png`,animations:'disabled',fullPage:name!=='12-all-assessment-questions'})})})

test('student topic summaries use dashboard cards',async({page})=>{
 await studentLearningUI(page);await page.goto('/#/performance?tab=bytopic')
 await expect(page.getByRole('heading',{name:'Topics and assessment coverage',exact:true})).toBeVisible()
 await expect(page.locator('.kpi-card .kpi-icon')).toHaveCount(7)
 await page.screenshot({path:'../feature-documentation/system-manual/41-student-learning/14-topic-summary-cards.png',animations:'disabled',fullPage:true})
})
