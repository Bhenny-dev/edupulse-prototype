import{test,expect}from'@playwright/test'
import{deanManagementUI}from'../dean-management-fixture'
for(const role of ['dean','associate_dean'])test(`${role} fills required instructor loading details`,async({page})=>{
 const fixture=await deanManagementUI(page,role)
 await page.goto('/#/records')
 await page.getByRole('button',{name:'Course actions for IT 401',exact:true}).click()
 await page.getByRole('menuitem',{name:'Add instructor',exact:true}).click()
 const modal=page.getByRole('dialog',{name:'Load IT 401',exact:true})
 await modal.getByRole('button',{name:'Load course',exact:true}).click()
 await expect(modal.getByRole('alert')).toBeVisible();expect(fixture.commands).toHaveLength(0)
 for(const [name,value]of Object.entries({'Time':'7:30 AM - 10:00 AM','Units':'3','Lecture units':'2','Lab units':'1','Number of hours':'5','Room':'A310','Program':'BSIT'}))await modal.getByLabel(name,{exact:true}).fill(value);await modal.getByText('Choose days',{exact:true}).click();await modal.getByRole('checkbox',{name:'Tuesday T',exact:true}).check();await modal.getByRole('checkbox',{name:'Thursday Th',exact:true}).check();await expect(modal.getByRole('checkbox',{name:'Monday M',exact:true})).toBeDisabled();await expect(modal.getByRole('checkbox',{name:/Sunday/})).toHaveCount(0);await page.screenshot({path:`.data/meeting-days-${role}.png`,fullPage:true})
 await expect(modal).toContainText('5 hours per week')
 await modal.getByRole('button',{name:'Load course',exact:true}).click()
 await expect(modal).toHaveCount(0)
 expect(fixture.commands[0].details).toMatchObject({days:'TTh',lab:'1',room:'A310',students:'',program:'BSIT',computed_hours:5})
})
