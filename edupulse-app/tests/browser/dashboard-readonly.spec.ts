import {test} from '@playwright/test'
import {readOnlyDashboard} from '../dashboard-readonly-ui'
for(const support of [false,true])test(`dashboard reads without replaying synchronization (${support?'support':'instructor'})`,async({page})=>{await readOnlyDashboard(page,support)})
