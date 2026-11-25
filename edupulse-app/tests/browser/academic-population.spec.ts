import {test} from '@playwright/test'
import {academicPopulationScene} from '../academic-population-ui'
for(const role of ['instructor','student'])test(`populated ${role} records restore without replaying commands`,async({page})=>{await academicPopulationScene(page,role)})
