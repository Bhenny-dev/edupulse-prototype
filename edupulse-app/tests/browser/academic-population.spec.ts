import {test} from '@playwright/test'
import {academicPopulationScene} from '../academic-population-ui'
for(const role of ['instructor','student'])test(`populated ${role} records restore without replaying commands`,async({page})=>{
 test.setTimeout(90000)
 await academicPopulationScene(page,role)
})
