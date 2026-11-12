import {test} from '@playwright/test'
import {outlineProgressScene} from '../outline-progress-ui'
test('validated weeks are placed directly and survive a later failure without saving or overwriting manual edits',async({page})=>{await outlineProgressScene(page)})
