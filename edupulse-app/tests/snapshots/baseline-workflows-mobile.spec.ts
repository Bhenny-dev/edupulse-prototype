import { test,expect } from './fixtures'
import { baselineUI } from '../baseline-fixture'

test('synthetic baseline mobile topic mastery and shared loading',async({page})=>{
 await baselineUI(page,'dean');await page.goto('/#/performance?tab=bytopic');await expect(page.getByRole('img',{name:/^Syllabus topic mastery radar:/})).toBeVisible();await page.screenshot({path:'../feature-documentation/system-walkthrough/09-restored-role-pages/48-mobile-topic-mastery.png',animations:'disabled',fullPage:true})
 await page.goto('/#/course-loading?tab=instructors');await page.getByLabel('Released course',{exact:true}).selectOption('IT 102');await page.getByLabel('Block',{exact:true}).fill('BSIT-1B');await page.getByRole('button',{name:'Suggest highest-priority instructor',exact:true}).click();await page.screenshot({path:'../feature-documentation/system-walkthrough/09-restored-role-pages/49-mobile-loading-proposal.png',animations:'disabled',fullPage:true})
})
