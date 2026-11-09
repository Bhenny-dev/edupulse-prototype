import { test } from './fixtures'
import { intakeScene } from './approved-syllabus-scenes'
test('approved syllabus: mobile direct intake',async({page})=>intakeScene(page,true))
test('approved syllabus: dark mobile review',async({page})=>intakeScene(page,true,true))
