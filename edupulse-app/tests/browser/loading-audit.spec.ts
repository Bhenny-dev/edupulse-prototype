import {test} from '@playwright/test'
import {joinLoading,deanSaveLoading,announcementLoading} from '../loading-audit-ui'
test('class lookup and join animate through pending and recover without replay',async({page})=>joinLoading(page))
for(const role of ['dean','associate_dean'])test(`${role} save animates, retains failed input and respects reduced motion`,async({page})=>deanSaveLoading(page,role))
test('announcement save animates and retains the draft on failure',async({page})=>announcementLoading(page))
