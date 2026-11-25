import { test, expect } from '../snapshots/fixtures'
import jsQR from 'jsqr'
import { PNG } from 'pngjs'
import { classroomSupportUI } from '../classroom-support-ui'

test.setTimeout(60000)
for (const dark of [false,true]) for (const support of [false,true]) test(`compact class code and readable invitation QR (${support?'Admin support':'Instructor'}, ${dark?'dark':'light'})`,async({page})=>{
 const fixture=await classroomSupportUI(page,support)
 await page.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{value:{writeText:async(text:string)=>{(window as any).__copied=text}},configurable:true}))
 await page.goto('/#/dashboard?course=IT%20201&tab=announcements')
 if(dark) await page.getByRole('button',{name:'Dark mode',exact:true}).click()
 const card=page.getByRole('region',{name:'Class Code',exact:true})
 await expect(card.getByRole('heading')).toHaveText('Class Code')
 await expect(card.getByRole('button')).toHaveCount(1)
 await expect(card.locator('p')).toHaveCount(0)
 await expect(card).toContainText('P4Q8RST')
 await expect(card).not.toContainText('No block section')
 await card.getByRole('button',{name:'Display the class code of block BSIT-2A',exact:true}).click()
 const display=page.getByRole('dialog',{name:'Class code display, IT 201 block BSIT-2A',exact:true})
 const qr=display.getByRole('img',{name:'Scan to join this class'})
 await expect(qr).toBeVisible()
 const url=new URL('/#/join/P4Q8RST',page.url()).href
 await expect(display.getByLabel('Invitation link',{exact:true})).toHaveValue(url)
 const pixels=PNG.sync.read(await qr.screenshot())
 expect(jsQR(new Uint8ClampedArray(pixels.data),pixels.width,pixels.height)?.data).toBe(url)
 await display.getByRole('button',{name:'Copy link',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>(window as any).__copied)).toBe(url)
 await display.getByRole('button',{name:'Copy code',exact:true}).click()
 await expect.poll(()=>page.evaluate(()=>(window as any).__copied)).toBe('P4Q8RST')
 await page.reload();await expect(display).toBeVisible({timeout:20000});await expect(qr).toBeVisible()
 expect(fixture.writes).toEqual([])
 await page.keyboard.press('Escape');await expect(display).toHaveCount(0)
 await expect(card.getByRole('button')).toBeFocused()
})

test('a freshly authorized code can display while its load projection arrives without issuing any write',async({page})=>{
 const fixture=await classroomSupportUI(page)
 fixture.records.institutional!.find(r=>r.kind==='loads'&&r.data.CourseCode==='IT 201')!.data.Block=''
 fixture.records.classCodes![1].parent_key='IT 201|BSIT-2A|1'
 await page.goto('/#/dashboard?course=IT%20201&tab=announcements')
 await expect(page.getByRole('region',{name:'Class Code',exact:true})).toContainText('P4Q8RST')
 expect(fixture.writes).toEqual([])
})
