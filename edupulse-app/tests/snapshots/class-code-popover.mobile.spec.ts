import { test, expect } from './fixtures'
import { classroomSupportUI, expectInvitationQr } from '../classroom-support-ui'
const folder='../feature-documentation/system-manual/55-class-code-invitations'
test('class code and invitation popover on a phone',async({page})=>{
 await classroomSupportUI(page,true)
 await page.goto('/#/dashboard?course=IT%20201&tab=announcements')
 const card=page.getByRole('region',{name:'Class Code',exact:true})
 await card.scrollIntoViewIfNeeded()
 await page.screenshot({path:`${folder}/phone-card.png`,animations:'disabled'})
 await card.getByRole('button').click()
 await expectInvitationQr(page)
 await page.screenshot({path:`${folder}/phone-popover.png`,animations:'disabled'})
})
