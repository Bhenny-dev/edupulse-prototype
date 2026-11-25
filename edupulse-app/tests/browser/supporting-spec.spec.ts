import {instructorCourseUI} from '../instructor-course-fixture'
import {test,expect} from '@playwright/test'
import {baselineUI} from '../baseline-fixture'
import {deanManagementUI} from '../dean-management-fixture'
for(const role of ['dean','associate_dean'])test(`${role} navigation preserves authorized directory access without Dean Students station`,async({page,isMobile})=>{
 const fixture=await deanManagementUI(page,role);await page.goto('/#/records')
 if(isMobile)await page.getByRole('button',{name:'Open menu',exact:true}).click()
 const navigation=page.getByRole('navigation',{name:isMobile?'Mobile navigation':'Main navigation',exact:true})
 if(role==='dean')await expect(navigation.getByRole('link',{name:'Students',exact:true})).toHaveCount(0)
 else await expect(navigation.getByRole('link',{name:'Students',exact:true})).toBeVisible()
 if(isMobile)await page.getByRole('button',{name:'Close menu',exact:true}).click()
 await page.goto('/#/students?q=Riley');await expect(page.getByRole('heading',{name:'Students',exact:true})).toBeVisible()
 await expect(page.getByRole('searchbox',{name:'Search students',exact:true})).toHaveValue('Riley')
 expect(fixture.commands).toHaveLength(0)
})

test('student block context and legacy Course links resolve on Home',async({page,isMobile})=>{
 const {records}=await baselineUI(page,'student')
 await page.goto('/#/courseware')
 await expect(page).toHaveURL(/#\/dashboard$/)
 const classes=page.getByRole('region',{name:'Your classes',exact:true})
 await expect(classes).toContainText('BSIT-1A')
 if(isMobile)await page.getByRole('button',{name:'Open menu',exact:true}).click()
 const navigation=page.getByRole('navigation',{name:isMobile?'Mobile navigation':'Main navigation',exact:true})
 await expect(navigation.getByRole('link',{name:'My Courses',exact:true})).toHaveCount(0)
 if(isMobile)await page.getByRole('button',{name:'Close menu',exact:true}).click()
 await page.goto('/#/courseware?course='+records.courses[0].id+'&studentTab=outline')
 await expect(page).toHaveURL(/#\/dashboard\?course=.*studentTab=outline/)
 await expect(page.getByRole('region',{name:'Published outline'})).toBeVisible()
 await page.reload()
 await expect(page.getByRole('region',{name:'Published outline'})).toBeVisible()
 await page.getByRole('button',{name:'Close class and return to Home'}).click()
 await expect(classes).toBeVisible()
})

test('a draft syllabus is not offered in the class: it stays on the Syllabus page, which the class links to',async({page})=>{
 const fixture=await instructorCourseUI(page);fixture.syllabus.status='drafted';await page.goto('/#/courseware');await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible({timeout:20000});await page.getByRole('region',{name:'Your classes'}).getByRole('button',{name:'Open course IT 102 · BSIT-1A',exact:true}).click();await expect(page.getByRole('region',{name:'Next step',exact:true})).toBeVisible()
 await expect(page.getByRole('link',{name:'Continue editing draft',exact:true})).toHaveCount(0)
 await page.getByRole('region',{name:'Next step',exact:true}).getByRole('button',{name:'Upload approved syllabus',exact:true}).click();await expect(page).toHaveURL(/tab=materials/)
 await expect(page.getByLabel('Upload approved syllabus PDF or DOCX')).toHaveCount(1);expect(fixture.commands).toHaveLength(0)
})


test('reader Next opens only another accessible item in the same course and retains its context',async({page},info)=>{
 test.setTimeout(60000)
 const fixture=await baselineUI(page,'student')
 const first=fixture.records.publications.find(item=>item.type==='material')!
 const next={...structuredClone(first),id:'dddddddddddddddddddddddddddddddd',week:2,title:'Next accessible reading'}
 const closed={...structuredClone(first),id:'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',week:1,title:'Unavailable reading',delivery_mode:'block_schedule',delivery_open_at:'2099-01-01T00:00:00Z'}
 fixture.records.publications=[first,closed,next,{...structuredClone(next),id:'ffffffffffffffffffffffffffffffff',course_id:'unrelated-course',week:3,title:'Another course reading'}]
 await page.goto('/#/courseware');await page.getByRole('region',{name:'Your classes'}).getByRole('button',{name:/^Open IT 102 /}).click();await page.getByRole('button',{name:'Teaching Materials & Assessments',exact:true}).click();await page.getByRole('button',{name:'Open material',exact:true}).first().click()
 await page.getByRole('button',{name:'Next: Next accessible reading',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`.data/support-spec-reader-${info.project.name}.png`})
 await page.getByRole('button',{name:'Next: Next accessible reading',exact:true}).click();const reader=page.getByRole('dialog',{name:next.title,exact:true});await expect(reader).toBeVisible();await expect(reader.getByRole('navigation',{name:'Next course item',exact:true})).toHaveCount(0)
 await page.reload();await expect(page.getByRole('heading',{name:'Home',exact:true})).toBeVisible({timeout:20000});await expect(reader).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Close class and return to Home',exact:true})).toBeVisible()
})
