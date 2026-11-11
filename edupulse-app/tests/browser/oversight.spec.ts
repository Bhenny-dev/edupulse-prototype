import {test,expect} from '@playwright/test'
import {oversightUI} from '../oversight-fixture'
for(const role of ['dean','associate_dean'])test(`${role} gets one combined oversight view with accurate scopes and old-link aliases`,async({page})=>{
 await oversightUI(page,role);await page.goto('/#/monitor?tab=delivery&keep=1');await expect(page).toHaveURL(/tab=overview/);expect(new URLSearchParams(new URL(page.url()).hash.split('?')[1]).get('keep')).toBe('1')
 const tabs=page.getByRole('navigation',{name:'Monitor views'});await expect(tabs.getByRole('button',{name:'Syllabus & Delivery',exact:true})).toHaveAttribute('aria-pressed','true');await expect(tabs.getByRole('button',{name:'Syllabus Status',exact:true})).toHaveCount(0);await expect(tabs.getByRole('button',{name:'Delivery Progress',exact:true})).toHaveCount(0)
 await expect(page.getByRole('img',{name:'Saved syllabus lifecycle stations',exact:true})).toHaveCount(1);await expect(page.getByRole('img',{name:'Released materials and assessments by course',exact:true})).toHaveCount(1)
 const table=page.getByRole('region',{name:'Syllabus and delivery by course',exact:true});await expect(table.getByRole('row')).toHaveCount(3);await expect(table.getByRole('row').filter({hasText:'Synthetic instructor'}).getByRole('cell',{name:'50%',exact:true})).toBeVisible();await expect(table).toContainText('Second sample instructor')
 const download=page.waitForEvent('download');await page.getByRole('button',{name:'Download CSV',exact:true}).first().click();expect((await download).suggestedFilename()).toBe('syllabus-and-delivery.csv')
 await page.getByRole('combobox',{name:'Course',exact:true}).selectOption('c'.repeat(32));await expect(table.getByRole('row')).toHaveCount(2);await expect(table).not.toContainText('Synthetic instructor');await expect(page.locator('.kpi-card').filter({hasText:'Released items'}).locator('.kpi-value')).toHaveText('0')
 await page.getByRole('searchbox',{name:'Search courses',exact:true}).fill('no match');for(const card of await page.locator('.kpi-card').all())await expect(card.locator('.kpi-value')).toHaveText('0')
 await page.goto('/#/monitor?tab=syllabi');await expect(page).toHaveURL(/tab=overview/)
 await tabs.getByRole('button',{name:'Student Oversight',exact:true}).click();await expect(page.getByRole('heading',{name:'Blocks and enrollment',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Recorded assessment attempts',exact:true})).toHaveCount(0)
 await tabs.getByRole('button',{name:'Alerts',exact:true}).click();await expect(page.getByRole('heading',{name:'Readiness and delivery alerts',exact:true})).toBeVisible()
 await expect(tabs.getByRole('button',{name:'Review Inbox',exact:true})).toHaveCount(0)
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
})
test('preview combines its two distinct sections and keeps legacy delivery links',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'Dean',exact:true}).click();await page.goto('/#/monitor?tab=delivery');await expect(page).toHaveURL(/tab=overview/);await expect(page.getByRole('heading',{name:'Syllabus Status',exact:true})).toBeVisible();await expect(page.getByRole('heading',{name:'Delivery Progress',exact:true})).toBeVisible();await expect(page.getByRole('navigation',{name:'Monitor views'}).getByRole('button')).toHaveCount(3)
})
