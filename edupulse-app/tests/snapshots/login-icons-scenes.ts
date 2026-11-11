import {expect,type Page} from './fixtures'
const folder='../feature-documentation/system-manual/01-getting-started'

/** Synthetic credentials and auth responses; never sends a password to a live service. */
export async function loginIconScenes(page:Page,mobile=false){
  await page.addInitScript(()=>localStorage.setItem('edupulse-walk','off'))
  let release!:()=>void
  const pending=new Promise<void>(resolve=>{release=resolve})
  let signIns=0
  await page.route('https://*.supabase.co/auth/v1/**',async route=>{
    const url=new URL(route.request().url())
    if(url.pathname.endsWith('/settings'))return route.fulfill({json:{external:{google:true}}})
    if(url.pathname.endsWith('/token')){signIns++;await pending;return route.fulfill({status:400,json:{error:'invalid_grant',error_description:'Synthetic sign-in validation'}})}
    return route.fulfill({status:401,json:{message:'Synthetic signed-out session'}})
  })
  await page.goto('/')
  await page.evaluate(()=>window.scrollTo(0,innerHeight+4))
  const panel=page.locator(mobile?'.signin-form':'.signin-frame')
  await page.locator('#login').scrollIntoViewIfNeeded()
  const password=page.getByLabel('Password',{exact:true}),google=page.getByRole('button',{name:'Sign in with Google',exact:true})
  await expect(google).toBeEnabled();await expect(google.locator('.login-google-icon')).toBeVisible()
  await expect(password).toHaveAttribute('type','password')
  const shot=async(name:string)=>panel.screenshot({path:`${folder}/${mobile?'mobile-':''}${name}.png`,animations:'disabled',style:'.login-quick-access{display:none !important}.lp-nav{visibility:hidden !important}'})
  await expect(page.getByRole('button',{name:'Show password',exact:true})).toBeVisible()
  await shot('01-sign-in-icons')
  await password.fill('PreviewOnly123')
  await password.press('Tab');await expect(page.getByRole('button',{name:'Show password',exact:true})).toBeFocused()
  await page.keyboard.press('Space')
  await expect(password).toHaveAttribute('type','text');await expect(password).toHaveValue('PreviewOnly123')
  await expect(page.getByRole('button',{name:'Hide password',exact:true})).toHaveAttribute('aria-pressed','true')
  expect(signIns).toBe(0)
  await shot('02-password-revealed')
  await page.getByRole('button',{name:'Hide password',exact:true}).click()
  await expect(password).toHaveAttribute('type','password');await expect(password).toHaveValue('PreviewOnly123')
  await page.getByLabel('Email',{exact:true}).fill('preview@example.invalid')
  await page.locator('.login-submit').click();await expect(page.locator('.login-submit')).toHaveText('Signing in…')
  await expect(google).toBeDisabled();await expect(google.locator('.login-google-icon')).toBeVisible()
  await expect(page.getByRole('button',{name:'Show password',exact:true})).toBeVisible()
  await shot('03-sign-in-busy')
  release();await expect(page.locator('.login-submit')).toBeEnabled()
  expect(signIns).toBe(1)
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true)
}
