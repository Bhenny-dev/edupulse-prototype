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

test('student block context and course navigation live in My Courses without source verification claims',async({page},info)=>{
 await baselineUI(page,'student');await page.goto('/#/dashboard')
 await expect(page.getByText('Instructor-verified',{exact:true})).toHaveCount(0);await expect(page.getByRole('heading',{name:'My Block',exact:true})).toHaveCount(0)
 await page.goto('/#/courseware');await expect(page.getByRole('heading',{name:'My Courses',exact:true})).toBeVisible({timeout:20000});await expect(page.getByRole('navigation',{name:'Breadcrumb',exact:true})).toContainText('My Courses');const table=page.getByRole('region',{name:'Enrolled courses',exact:true});await expect(table).toBeVisible();await expect(table).toContainText('BSIT-1A')
 await page.screenshot({path:`.data/support-spec-student-table-${info.project.name}.png`,fullPage:true})
 await table.getByRole('button',{name:'Open course IT 102',exact:true}).click();await page.reload();await expect(page.getByRole('button',{name:'Back to My Courses',exact:true})).toBeVisible();await page.getByRole('button',{name:'Back to My Courses',exact:true}).click();await expect(table).toBeVisible()
})

test('instructor course table links its genuine draft to the existing editable builder',async({page})=>{
 const fixture=await instructorCourseUI(page);fixture.syllabus.status='drafted';await page.goto('/#/courseware');await expect(page.getByRole('heading',{name:'Course',exact:true})).toBeVisible({timeout:20000});await expect(page.getByRole('region',{name:'Assigned teaching courses',exact:true})).toBeVisible();await page.getByRole('button',{name:'Open course IT 102',exact:true}).click()
 const edit=page.getByRole('link',{name:'Continue editing draft',exact:true});await expect(edit).toHaveAttribute('href',`#/syllabus?tab=builder&edit=${encodeURIComponent(fixture.syllabus.id)}`);await edit.click();await expect(page).toHaveURL(new RegExp(`edit=${fixture.syllabus.id}`));await expect(page.getByRole('navigation',{name:'Syllabus sections',exact:true})).toBeVisible();expect(fixture.commands).toHaveLength(0)
})


test('reader Next opens only another accessible item in the same course and retains its context',async({page},info)=>{
 test.setTimeout(60000)
 const fixture=await baselineUI(page,'student')
 const first=fixture.records.publications.find(item=>item.type==='material')!
 const next={...structuredClone(first),id:'dddddddddddddddddddddddddddddddd',week:2,title:'Next accessible reading'}
 const closed={...structuredClone(first),id:'eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee',week:1,title:'Unavailable reading',delivery_mode:'block_schedule',delivery_open_at:'2099-01-01T00:00:00Z'}
 fixture.records.publications=[first,closed,next,{...structuredClone(next),id:'ffffffffffffffffffffffffffffffff',course_id:'unrelated-course',week:3,title:'Another course reading'}]
 await page.goto('/#/courseware');await page.getByRole('button',{name:'Open course IT 102',exact:true}).click();await page.getByRole('button',{name:'Open material',exact:true}).first().click()
 await page.getByRole('button',{name:'Next: Next accessible reading',exact:true}).scrollIntoViewIfNeeded();await page.screenshot({path:`.data/support-spec-reader-${info.project.name}.png`})
 await page.getByRole('button',{name:'Next: Next accessible reading',exact:true}).click();const reader=page.getByRole('dialog',{name:next.title,exact:true});await expect(reader).toBeVisible();await expect(reader.getByRole('navigation',{name:'Next course item',exact:true})).toHaveCount(0)
 await page.reload();await expect(page.getByRole('heading',{name:'My Courses',exact:true})).toBeVisible({timeout:20000});await expect(reader).toBeVisible();await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Back to My Courses',exact:true})).toBeVisible()
})
