import {test,expect} from './fixtures'
import {systemSearchUI} from '../system-search-fixture'
test.use({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true})
test('system-first search images and credits fit a phone',async({page})=>{
  await systemSearchUI(page);await page.goto('/#/dashboard');await page.getByRole('button',{name:'Open Pulse assistant'}).click()
  const panel=page.getByRole('dialog',{name:'Pulse',exact:true})
  await panel.getByRole('textbox',{name:'Ask Pulse',exact:true}).fill('What is photosynthesis?');await panel.getByRole('button',{name:'Send',exact:true}).click()
  await expect(panel.getByRole('link',{name:'Image credits'})).toBeVisible();await expect.poll(()=>panel.getByRole('img',{name:'Photosynthesis',exact:true}).evaluate((node:HTMLImageElement)=>node.naturalWidth)).toBeGreaterThan(0)
  await panel.screenshot({path:'../feature-documentation/system-manual/24-system-first-search/05-mobile-web-images.png',animations:'disabled'})
})
