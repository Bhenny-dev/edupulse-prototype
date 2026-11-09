import {test,expect} from './fixtures'
import {systemSearchUI} from '../system-search-fixture'
const folder='../feature-documentation/system-manual/24-system-first-search'

test('verified account self recognition uses username and role',async({page})=>{
 await systemSearchUI(page);await page.goto('/#/dashboard');await page.getByRole('button',{name:'Open Pulse assistant'}).click()
 const panel=page.getByRole('dialog',{name:'Pulse',exact:true});await panel.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('do you know me?');await panel.getByRole('button',{name:'Send',exact:true}).click()
 await expect(panel).toContainText('Username: teacher@example.invalid');await expect(panel).toContainText('Role: Instructor');await expect(panel).not.toContainText('Internet suggestions')
 await panel.screenshot({path:`${folder}/09-verified-self-account.png`,animations:'disabled'})
})

test('person follow-up retains the registered subject without claiming a public identity',async({page})=>{
  await systemSearchUI(page);await page.goto('/#/dashboard');await page.getByRole('button',{name:'Open Pulse assistant'}).click()
  const panel=page.getByRole('dialog',{name:'Pulse',exact:true})
  for(const message of ['Do you know alexandra benlro d. sample?','Do you know him on fb?']) {
    await panel.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill(message);await panel.getByRole('button',{name:'Send',exact:true}).click()
    await expect(panel).toContainText(message.includes('alexandra')?'Did you mean ALEXANDRA BENLOR DAYSA SAMPLE?':'You mean ALEXANDRA BENLOR DAYSA SAMPLE.')
    await expect(panel.getByRole('textbox',{name:'Ask Pulse',exact:true})).toHaveValue('')
    await expect(panel.getByRole('button',{name:'Send',exact:true})).toBeDisabled()
  }
  await expect(panel).toContainText('You mean ALEXANDRA BENLOR DAYSA SAMPLE.')
  await expect(panel).toContainText('does not provide a verified Facebook link')
  await expect(panel.getByRole('link',{name:'Search Facebook for ALEXANDRA BENLOR DAYSA SAMPLE'})).toBeVisible()
  await panel.screenshot({path:`${folder}/07-person-follow-up.png`,animations:'disabled'})
})

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
