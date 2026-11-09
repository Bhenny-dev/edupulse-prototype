import {test} from './fixtures'
import {overviewScene,reviewScene,previewScene} from './oversight-scenes'
for(const role of ['dean','associate_dean'])test(`oversight: combined ${role} records`,async({page})=>overviewScene(page,role))
test('oversight: retained Dean offline review',async({page})=>reviewScene(page))
test('oversight: combined preview',async({page})=>previewScene(page))
