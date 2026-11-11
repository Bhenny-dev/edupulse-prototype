import {test} from './fixtures'
import {loginIconScenes} from './login-icons-scenes'
test('sign-in icon controls support keyboard reveal and remain visible while busy',async({page})=>{await loginIconScenes(page)})
