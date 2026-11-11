import {test} from './fixtures'
import {loginIconScenes} from './login-icons-scenes'
test('phone sign-in icon controls reveal and hide without submitting',async({page})=>{await loginIconScenes(page,true)})
