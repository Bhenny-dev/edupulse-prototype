import {test,expect} from './fixtures'
import {systemSearchUI} from '../system-search-fixture'
const folder='../feature-documentation/system-manual/24-system-first-search'

test('keyless system answers, spelling suggestions and sourced web images',async({page})=>{
  await systemSearchUI(page);await page.goto('/#/dashboard');await page.getByRole('button',{name:'Open Pulse assistant'}).click()
  const panel=page.getByRole('dialog',{name:'Pulse',exact:true})
  for(const [message,expected,file] of [
    ['Do you know alexandra benlro d. sample?','Did you mean ALEXANDRA BENLOR DAYSA SAMPLE?','01-profile-suggestion'],
    ['How do I publsih a sylabus?','Mark an item checked before publishing','02-keyless-help'],
    ['What is photosynthesis?','These are Internet suggestions','03-web-images'],
  ]) {
    await panel.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill(message);await panel.getByRole('button',{name:'Send',exact:true}).click();await expect(panel).toContainText(expected)
    if(file==='03-web-images')await expect.poll(()=>panel.getByRole('img',{name:'Photosynthesis',exact:true}).evaluate((node:HTMLImageElement)=>node.naturalWidth)).toBeGreaterThan(0)
    await panel.screenshot({path:`${folder}/${file}.png`,animations:'disabled'})
  }
  await page.getByTitle('Dark mode',{exact:true}).click();await expect(page.locator('html')).toHaveClass(/dark-mode/);await panel.screenshot({path:`${folder}/04-dark-web-images.png`,animations:'disabled'})
})

test('unavailable public image keeps its source and attribution links',async({page})=>{
  const fixture=await systemSearchUI(page);fixture.breakImages()
  await page.goto('/#/dashboard');await page.getByRole('button',{name:'Open Pulse assistant'}).click()
  const panel=page.getByRole('dialog',{name:'Pulse',exact:true})
  await panel.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('What is photosynthesis?');await panel.getByRole('button',{name:'Send',exact:true}).click()
  await expect(panel).toContainText('Image unavailable');await expect(panel.getByRole('link',{name:'Image credits'})).toBeVisible()
  await panel.screenshot({path:`${folder}/06-image-unavailable.png`,animations:'disabled'})
})
