import {test} from '@playwright/test'
import {editorLayoutUI} from '../editor-layout-ui'
test('long assessment and teaching-material fields wrap without clipping',async({page})=>editorLayoutUI(page))
