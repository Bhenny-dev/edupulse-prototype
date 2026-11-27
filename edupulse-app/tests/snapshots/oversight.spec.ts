import {test} from './fixtures'
import {overviewScene} from './oversight-scenes'
for(const role of ['dean','associate_dean'])test(`oversight: combined ${role} records`,async({page})=>overviewScene(page,role))
