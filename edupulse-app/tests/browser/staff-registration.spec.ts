import {test,expect} from '@playwright/test'
import {staffRegistrationUI} from '../staff-registration-fixture'

test('registered staff search routes each corrected role to its named accounts',async({page})=>{
  await staffRegistrationUI(page);await page.goto('/#/dashboard')
  for(const [role,name] of [['Instructor','Marielle Angela Fianza-Buya'],['Program Coordinator','Myriell Nginsayan'],['Dean','Ginard S. Guaki']]) {
    await page.getByText(role,{exact:true}).locator('..').getByRole('button',{name:'Open view',exact:true}).click()
    const picker=page.getByRole('dialog',{name:`Choose ${role.toLowerCase()} account`})
    await expect(picker.getByRole('button',{name:`View ${name}`,exact:true})).toBeVisible()
    if(role==='Instructor') {
      await expect(picker).toContainText('7 accounts found')
      await picker.getByRole('searchbox',{name:'Search accounts'}).fill('fianza-buya')
      await expect(picker).toContainText('1 account found')
      await expect(picker).not.toContainText('Myriell Nginsayan')
    }
    await picker.getByRole('button',{name:'Close account selection'}).click()
  }
})
