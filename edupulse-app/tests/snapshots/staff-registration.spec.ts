import {test,expect} from './fixtures'
import {staffRegistrationUI} from '../staff-registration-fixture'
const folder='../feature-documentation/system-manual/25-staff-test-accounts'

test('named staff role pickers show surname logins and corrected academic roles',async({page})=>{
  await staffRegistrationUI(page);await page.goto('/#/dashboard')
  for(const [role,name,file] of [['Instructor','Marielle Angela Fianza-Buya','01-instructor-accounts'],['Program Coordinator','Myriell Nginsayan','03-associate-dean'],['Dean','Ginard S. Guaki','04-dean']]) {
    await page.getByText(role,{exact:true}).locator('..').getByRole('button',{name:'Open view',exact:true}).click()
    const picker=page.getByRole('dialog',{name:`Choose ${role.toLowerCase()} account`})
    await expect(picker.getByRole('button',{name:`View ${name}`,exact:true})).toBeVisible()
    await picker.screenshot({path:`${folder}/${file}.png`,animations:'disabled'})
    if(role==='Instructor') {
      await picker.getByRole('searchbox',{name:'Search accounts'}).fill('fianza-buya@edupulse.com')
      await expect(picker).toContainText('1 account found');await picker.screenshot({path:`${folder}/02-filtered-instructor.png`,animations:'disabled'})
    }
    await picker.getByRole('button',{name:'Close account selection'}).click()
  }
})
