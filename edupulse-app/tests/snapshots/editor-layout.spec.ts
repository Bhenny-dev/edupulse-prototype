import {test} from './fixtures'
import {editorLayoutUI} from '../editor-layout-ui'
test('wide assessment and material editors show complete wrapped text',async({page})=>editorLayoutUI(page,async name=>{
 await page.locator(name==='assessment'?'.assessment-page':name==='presentation'?'.pres-slide':'.doc-viewer-page').screenshot({path:`../feature-documentation/system-manual/26-outline-driven-courseware/wide-${name}-editor.png`,animations:'disabled',style:'.app-topbar{visibility:hidden !important}'})
}))
