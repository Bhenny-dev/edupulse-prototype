import { expect, type Page } from '@playwright/test'
import { deanManagementUI } from './dean-management-fixture'
import { monitoringUI } from './monitoring-fixture'
import { automaticRecordsUI } from './automatic-records-fixture'

export const iconRoles = ['admin', 'dean', 'associate_dean', 'instructor', 'student'] as const
export type IconRole = typeof iconRoles[number]
export const iconRoutes: Record<IconRole, string[]> = {
  admin: ['/dashboard', '/settings', '/notifications'],
  dean: ['/dashboard', '/records', '/instructors', '/students', '/course-loading', '/performance', '/settings', '/notifications'],
  associate_dean: ['/dashboard', '/records', '/instructors', '/students', '/course-loading', '/settings', '/notifications'],
  instructor: ['/dashboard', '/schedule', '/syllabus', '/courseware', '/student-monitoring', '/performance', '/content-editor', '/settings', '/notifications'],
  student: ['/dashboard', '/schedule', '/assessment', '/performance', '/settings', '/notifications'],
}
export const iconScene: Record<IconRole, string> = { admin: '/dashboard', dean: '/dashboard', associate_dean: '/records', instructor: '/student-monitoring', student: '/performance' }

/** Fictional records and controlled transport; this checks presentation, not hosted authorization. */
export async function flatIconsUI(page: Page, role: IconRole, dark = false) {
  await page.addInitScript(value => { if (localStorage.getItem('edupulse-dark-mode') === null) localStorage.setItem('edupulse-dark-mode', String(value)) }, dark)
  if (role === 'dean' || role === 'associate_dean') await deanManagementUI(page, role)
  else if (role === 'admin') {
    await automaticRecordsUI(page, role)
    await page.route('https://*.supabase.co/auth/v1/settings', route => route.fulfill({ json: { external: { google: true } } }))
    await page.route('https://*.supabase.co/rest/v1/rpc/edupulse_admin_role_monitoring', route => route.fulfill({ json: { roles: [], recent: [] } }))
  } else await monitoringUI(page, role)
}

export async function expectFlatIcons(page: Page, requireIcons = false) {
  const icons = page.locator('.glass-icon')
  if (requireIcons) await expect(icons.first()).toBeVisible()
  const raised = await icons.evaluateAll(elements => elements.flatMap(element => {
    const style = getComputedStyle(element), face = element.querySelector('.glass-icon-face'), svg = element.querySelector('svg')
    const bad = style.transform !== 'none' || style.boxShadow !== 'none' || style.backgroundImage !== 'none' || style.filter !== 'none'
      || getComputedStyle(element, '::before').content !== 'none' || getComputedStyle(element, '::after').content !== 'none'
      || (face && getComputedStyle(face).transform !== 'none') || (svg && getComputedStyle(svg).filter !== 'none')
    return bad ? [element.outerHTML.slice(0, 200)] : []
  }))
  expect(raised).toEqual([])
}
