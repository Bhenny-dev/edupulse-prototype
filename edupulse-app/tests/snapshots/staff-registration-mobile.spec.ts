import {test,expect} from './fixtures'
import {staffRegistrationUI} from '../staff-registration-fixture'
test('surname account search remains usable on a phone',async({page})=>{
  await staffRegistrationUI(page);await page.goto('/#/dashboard')
  await page.getByText('Instructor',{exact:true}).locator('..').getByRole('button',{name:'Open view',exact:true}).click()
  const picker=page.getByRole('dialog',{name:'Choose instructor account'})
  await picker.getByRole('searchbox',{name:'Search accounts'}).fill('guisdan@edupulse.com')
  await expect(picker.getByRole('button',{name:'View Rogelio L. Guisdan',exact:true})).toBeVisible()
  await picker.screenshot({path:'../feature-documentation/system-manual/25-staff-test-accounts/05-mobile-staff-search.png',animations:'disabled'})
})
