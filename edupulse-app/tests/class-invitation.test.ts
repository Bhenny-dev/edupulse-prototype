import test from 'node:test'
import assert from 'node:assert/strict'
import { classInvitationPath, classInvitationUrl } from '../src/utils/classInvitation'
test('invitation URLs normalize existing codes, preserve app paths and strip other navigation state',()=>{
 assert.equal(classInvitationPath('k7m 2qxp'),'/join/K7M2QXP')
 assert.equal(classInvitationUrl('K7M2QXP','https://example.invalid/app/?course=private#/dashboard?subject=x'),'https://example.invalid/app/#/join/K7M2QXP')
 assert.throws(()=>classInvitationPath('wrong'))
})
