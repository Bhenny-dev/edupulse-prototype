import {expect,type Page} from './fixtures.js'
const folder='../feature-documentation/system-manual/32-public-pulse-search'
export async function publicPulseScenes(page:Page,mobile=false) {
 await page.context().addInitScript(()=>localStorage.setItem('edupulse-walk','on'))
 await page.goto('/#/pulse');await expect(page.locator('.ps-pulse-stage')).toHaveClass(/is-(scene|flat)/,{timeout:90000})
 const field=page.locator('#ps-chat-field'),last=page.locator('.ps-chat-line').last(),requests:string[]=[]
 page.on('request',r=>{if(/\/api\/ai.*action=(?:chat|operator|students|support)|supabase.*students/.test(r.url()))requests.push(r.url())})
 const ask=async(text:string,match:RegExp)=>{await field.fill(text);await field.press('Enter');await expect(last).toContainText(match)}
 const shot=async(name:string)=>{await page.mouse.move(2,400);await page.screenshot({path:`${folder}/${mobile?'mobile-':''}${name}.png`,animations:'disabled'})}
 await ask('do you know bhenny?',/Bhenny Benlor D\. Rivera/)
 await ask('he is a student',/About the person you mentioned/)
 await shot('01-person-follow-up')
 await ask('instrcutors',/Did you mean instructors/);await expect(last).toContainText('Rogelio L. Guisdan')
 await shot('02-ranked-public-staff')
 await ask('How do I uplod a sylabus?',/My Syllabus, Shared Repository and Syllabus Builder/)
 await shot('03-feature-help')
 if(!mobile){await page.getByRole('button',{name:'Dark mode',exact:true}).click();await expect(page.locator('html')).toHaveClass(/dark-mode/);await page.screenshot({path:`${folder}/04-dark-feature-help.png`,animations:'disabled'})}
 expect(requests).toEqual([]);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
}
