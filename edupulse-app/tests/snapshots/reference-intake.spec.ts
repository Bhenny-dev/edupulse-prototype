import {test} from './fixtures'
import {referenceIntakeScene} from './reference-intake-scenes'
test('reference intake: link, loading, index retry, extracted citation, retained reading and file',async({page})=>referenceIntakeScene(page))
test('reference intake: dark extracted citation',async({page})=>referenceIntakeScene(page,false,true))
