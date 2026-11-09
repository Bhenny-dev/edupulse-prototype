import {test,expect} from '@playwright/test'

test('public Pulse answers names, role statements and typo searches without chat or directory requests',async({page})=>{
 test.setTimeout(90000);await page.emulateMedia({reducedMotion:'reduce'});await page.goto('/#/pulse')
 await expect(page.locator('#ps-chat-field')).toBeVisible()
 const requests:string[]=[]
 page.on('request',request=>{if(/\/api\/ai.*action=(?:chat|operator|students|support|conversations)|supabase.*(?:students|users|auth)/.test(request.url()))requests.push(request.url())})
 const field=page.locator('#ps-chat-field'),last=page.locator('.ps-chat-line').last()
 const ask=async(text:string,match:RegExp)=>{await field.fill(text);await field.press('Enter');await expect(last).toContainText(match)}
 await ask('do you know bhenny?',/Bhenny Benlor D\. Rivera/)
 await ask('he is a student',/About the person you mentioned/);await expect(last).not.toContainText('No. For students')
 if((page.viewportSize()?.width||1440)<900&&await page.locator('.ps-pulse-stage').evaluate(el=>el.classList.contains('is-scene')))await expect(page.locator('.ps-room-title')).toBeHidden()
 await ask('kilala mo ba siya sa fb?',/You mean Bhenny/)
 await ask('instrcutors',/Did you mean instructors/);await expect(last).toContainText('Marielle Angela Fianza-Buya')
 await ask('stduents',/released learning materials/);await expect(last).not.toContainText('No. For students')
 await ask('How do I uplod a sylabus?',/My Syllabus, Shared Repository and Syllabus Builder/)
 await ask('show me feautres',/Did you mean features/);await expect(last).toContainText('online assessments')
 await page.getByRole('button',{name:'Dark mode',exact:true}).click()
 const contrast=await page.locator('.ws-bubble').evaluate(bubble=>{
  const lum=(css:string)=>{const [r,g,b]=(css.match(/[\d.]+/g)||[]).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);return .2126*r!+.7152*g!+.0722*b!}
  const background=lum(getComputedStyle(bubble).backgroundColor),text=lum(getComputedStyle(bubble.querySelector('.ws-bubble-body')!).color)
  return (Math.max(background,text)+.05)/(Math.min(background,text)+.05)
 })
 expect(contrast,'the agent speech bubble must remain readable at night').toBeGreaterThanOrEqual(4.5)
 await ask('who is unknownxyz?',/could not find that person/)
 await expect(page.locator('.ps-chat-note')).toHaveText('Searches public EduPulse information on this page. No AI key; messages are not sent or saved.')
 expect(requests).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})
