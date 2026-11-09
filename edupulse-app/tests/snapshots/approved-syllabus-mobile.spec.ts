import { test } from './fixtures'
import { intakeScene, layoutReviewScene, builderSourceScene } from './approved-syllabus-scenes'
test('approved syllabus: mobile direct intake',async({page})=>intakeScene(page,true))
test('approved syllabus: dark mobile review',async({page})=>intakeScene(page,true,true))
test('approved syllabus: mobile scaled files and missing-week review',async({page})=>layoutReviewScene(page,true))
test('approved syllabus: mobile imported builder identity',async({page})=>builderSourceScene(page,true))
