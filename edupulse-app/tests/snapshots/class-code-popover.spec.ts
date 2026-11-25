import { test, expect } from './fixtures'
import { classroomSupportUI, expectInvitationQr } from '../classroom-support-ui'
const folder='../feature-documentation/system-manual/55-class-code-invitations'
for(const support of [false,true])test(`class code QR invitation ${support?'Admin support':'Instructor'}`,async({page})=>{
 await classroomSupportUI(page,support)
 await page.goto('/#/dashboard?course=IT%20201&tab=announcements')
 const card=page.getByRole('region',{name:'Class Code',exact:true})
 await expect(card).toContainText('P4Q8RST')
 await card.screenshot({path:`${folder}/${support?'admin':'instructor'}-card.png`,animations:'disabled'})
 await card.getByRole('button',{name:'Display the class code of block BSIT-2A',exact:true}).click()
 await expectInvitationQr(page)
 await page.screenshot({path:`${folder}/${support?'admin':'instructor'}-popover.png`,animations:'disabled'})
})
test('dark class code and QR invitation',async({page})=>{
 await classroomSupportUI(page,true)
 await page.goto('/#/dashboard?course=IT%20201&tab=announcements')
 await page.getByRole('button',{name:'Dark mode',exact:true}).click()
 await page.getByRole('region',{name:'Class Code',exact:true}).getByRole('button').click()
 await expectInvitationQr(page)
 await page.screenshot({path:`${folder}/dark-popover.png`,animations:'disabled'})
})
