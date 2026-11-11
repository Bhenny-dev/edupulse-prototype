import {expect,type Page} from './fixtures'
import {localModelUI} from '../local-model-fixture'
const folder='../feature-documentation/system-manual/08-ai-connections'
export async function localModelScenes(page:Page,mobile=false){
 const fixture=await localModelUI(page)
 await page.goto('/#/settings?tab=ai-provider')
 const select=page.getByLabel('On-device model',{exact:true}),panel=page.locator('[data-pulse-target="AI connection"]')
 await expect(select.locator('option')).toHaveCount(12);await expect(page.getByText(/1 of 12 models downloaded/)).toBeVisible()
 const shot=async(file:string)=>panel.screenshot({path:`${folder}/${mobile?'mobile-':''}${file}.png`,animations:'disabled',style:'.app-topbar{position:static !important}.connected-pulse-dock{visibility:hidden !important}'})
 await shot(mobile?'local-model-catalog':'03-on-device-model')
 await select.selectOption(fixture.cachedModel.id);await expect(page.getByRole('button',{name:'Remove downloaded model',exact:true})).toBeVisible()
 await page.reload();await expect(select).toHaveValue(fixture.cachedModel.id);await expect(page.getByText(/1 of 12 models downloaded/)).toBeVisible();await shot('10-cached-local-model')
 await page.getByRole('button',{name:'Remove downloaded model',exact:true}).click();await expect(page.getByText(/0 of 12 models downloaded/)).toBeVisible();await shot('11-local-model-removed')
}
