import{test,expect}from'@playwright/test'
import{deanManagementUI}from'../dean-management-fixture'
for(const role of ['dean','associate_dean'])test(`${role} fills required instructor loading details`,async({page})=>{
 const fixture=await deanManagementUI(page,role)
 await page.goto('/#/records')
 await page.getByRole('button',{name:/^IT 401 Capstone project,/}).click()
 await page.getByRole('button',{name:'Add instructor',exact:true}).click()
 const modal=page.getByRole('dialog',{name:'Load IT 401',exact:true})
 await modal.getByRole('button',{name:'Load course',exact:true}).click()
 await expect(modal.getByRole('alert')).toBeVisible();expect(fixture.commands).toHaveLength(0)
 for(const [name,value]of Object.entries({'Time':'7:30 AM - 10:00 AM','Day':'F','Units':'3','Lecture units':'2','Lab units':'1','Number of hours':'2.5','Room':'A310','Program':'BSIT'}))await modal.getByLabel(name,{exact:true}).fill(value)
 await expect(modal).toContainText('2.5 hours per week')
 await modal.getByRole('button',{name:'Load course',exact:true}).click()
 await expect(modal).toHaveCount(0)
 expect(fixture.commands[0].details).toMatchObject({days:'F',lab:'1',room:'A310',students:'',program:'BSIT',computed_hours:2.5})
})
