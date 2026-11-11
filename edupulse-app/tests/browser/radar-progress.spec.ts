import {test,expect} from '@playwright/test'
import {radarProgressUI} from '../radar-progress-fixture'
for(const scored of [1,2,3])test(`radar requires three distinct scored assessments: ${scored} available`,async({page})=>{
 await radarProgressUI(page,scored);await page.goto('/#/performance')
 const radar=page.getByRole('img',{name:/^Assessment score radar:/})
 if(scored<3){await expect(radar).toHaveCount(0);await expect(page.getByText(`At least three scored assessments are needed for a meaningful radar. ${scored} available.`)).toBeVisible()}
 else{
  await expect(radar).toHaveAttribute('aria-label',/Interpretation 75%.*Limits 92%.*Interpretation 58%/)
  await page.reload();await expect(radar).toBeVisible()
  await page.getByRole('combobox',{name:'Activity records',exact:true}).selectOption('student')
  await expect(radar).toHaveCount(0)
 }
})
