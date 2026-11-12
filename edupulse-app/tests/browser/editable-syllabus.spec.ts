import {test} from '@playwright/test'
import {editableSyllabusScene} from '../editable-syllabus-ui'
test('saved drafts reopen, AI places weeks directly, follow-ups retain scope and explicit saving stays in the builder',async({page})=>{test.setTimeout(90000);await editableSyllabusScene(page)})
