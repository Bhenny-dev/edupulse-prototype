import {test} from './fixtures'
import {citationRepairUI} from '../citation-repair-fixture'
test('repaired citation and catalog-only retained record',async({page})=>{
 await citationRepairUI(page)
 await page.screenshot({path:'../feature-documentation/system-manual/31-retained-syllabus-sources/14-repaired-citation.png',fullPage:true})
 await page.getByRole('button',{name:'View',exact:true}).click()
 await page.reload()
 await page.getByRole('dialog',{name:'Retained source review',exact:true}).getByTestId('retained-source-body').waitFor()
 await page.screenshot({path:'../feature-documentation/system-manual/31-retained-syllabus-sources/15-catalog-metadata-review.png',fullPage:true})
})
