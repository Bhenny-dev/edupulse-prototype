import {test,expect} from './fixtures'
import {outlineCoursewareUI} from '../outline-courseware-fixture'
test('unfinished courseware is readable and resumable on a narrow screen',async({page})=>{
  const fixture=await outlineCoursewareUI(page);fixture.failStep('lesson-3')
  await page.goto(`/#/courseware?course=${fixture.syllabus.id}&week=5`)
  await page.getByRole('button',{name:'Week 5 actions',exact:true}).click();await page.getByRole('menuitem',{name:'Regenerate week',exact:true}).click()
  await expect(page.getByText('Generation did not finish',{exact:true})).toBeVisible()
  await page.screenshot({path:'../feature-documentation/system-manual/26-outline-driven-courseware/09-mobile-resume.png',animations:'disabled',fullPage:true,style:'.app-topbar{position:static !important}'})
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1)).toBe(true)
})
