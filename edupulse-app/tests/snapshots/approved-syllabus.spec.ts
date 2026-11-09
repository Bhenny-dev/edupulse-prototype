import { test, expect } from './fixtures'
import { intakeScene } from './approved-syllabus-scenes'
import { unifiedCoursewareUI } from '../courseware-unified-fixture'
test('approved syllabus: direct course intake and review',async({page})=>intakeScene(page))
test('approved syllabus: existing course list and actions retain upload access',async({page})=>{
 await unifiedCoursewareUI(page);await page.goto('/#/courseware')
 await expect(page.getByRole('link',{name:'Upload syllabi',exact:true})).toBeVisible()
 const root='../feature-documentation/system-manual/03-courseware-generation-and-review'
 await page.mouse.move(2,400);await page.screenshot({path:`${root}/01-courseware-with-active-syllabus.png`,animations:'disabled',fullPage:true,style:'.app-topbar{position:static !important}'})
 await page.getByRole('button',{name:'More actions for IT 102',exact:true}).click();await expect(page.getByRole('menu')).toBeVisible()
 await page.screenshot({path:`${root}/12-course-actions-menu.png`,animations:'disabled',style:'.app-topbar{position:static !important}'})
})
