import type {Page} from '@playwright/test'
import {baselineUI} from './baseline-fixture'

// Synthetic render fixture only. The SQL test separately exercises authorization and real scoring.
export async function pipelineProgressUI(page:Page,role='instructor') {
 const fixture=await baselineUI(page,role)
 fixture.records.attempts[0].is_test=true
 fixture.records.accesses.push({publication_id:fixture.records.publications[0].id,student_id:'synthetic-learner',student_email:'ui.fixture@example.invalid',first_opened_at:'2026-11-09T12:00:00Z',is_test:true})
 return fixture
}
