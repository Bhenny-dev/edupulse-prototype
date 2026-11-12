import {test} from './fixtures'
import {outlineProgressScene} from '../outline-progress-ui'
import {mkdir} from 'node:fs/promises'
const dir='../feature-documentation/system-manual/34-progressive-outlines'
const names:Record<string,string>={progress:'01-weeks-arrive',stopped:'02-stopped-prefix',editable:'03-editable-weeks'}
test('direct progressive outline placement and retained failure state',async({page})=>{await mkdir(dir,{recursive:true});await outlineProgressScene(page,async(name,target)=>{if(names[name])await target.screenshot({path:`${dir}/${names[name]}.png`,animations:'disabled'})})})
