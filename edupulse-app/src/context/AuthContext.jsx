import { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { supabase } from '../lib/supabaseClient'
import { aiRequest, setAiAccessToken, setAiSubject } from '../lib/aiClient'
import { accountUser, canSwitchRole, isSystemAdminEmail, ROLE_TITLES } from '../lib/authRoles'
import { recordAudit } from '../lib/audit'
import AccountSwitchModal from '../components/admin/AccountSwitchModal'
import { clearAdminPicker, clearAdminView, readAdminPicker, readAdminView, saveAdminPicker, saveAdminView } from '../lib/adminViewState'

const AuthContext = createContext(null)

// Sample personas are available only on the local development server.
const DEMO_USERS = {
  admin: { id: 0, name: 'System Admin', role: 'admin', title: 'System Admin', department: 'EduPulse', canSwitchRoles: false },
  dean: { id: 1, name: 'Ginard S. Guaki', role: 'dean', title: 'Dean', email: 'ginard.guaki@kcp.edu.ph', department: 'College of IT' },
  associate_dean: { id: 2, name: 'Myriell Nginsayan', role: 'associate_dean', title: 'Associate Dean', department: 'College of IT' },
  instructor: { id: 1, name: 'Sir Rogelio L. Guisdan', role: 'instructor', title: 'Instructor', email: 'rogelio.guisdan@kcp.edu.ph', department: 'College of IT', specialization: 'Web & Mobile Development' },
  student: { id: 4, name: 'Bhenny Benlor D. Rivera', role: 'student', title: 'Student', email: 'bhenny.rivera@kcp.edu.ph', department: 'College of IT', yearLevel: 3, section: 'BSIT-3A' },
}

const ROLE_PERMISSIONS = {
  admin: ['manage_users', 'view_audit_logs', 'view_system_health', 'load_courses', 'confirm_ai_loading', 'manage_block_sections', 'monitor_faculty', 'monitor_delivery', 'view_student_oversight', 'export_reports'],
  dean: ['load_courses', 'confirm_ai_loading', 'manage_block_sections', 'monitor_faculty', 'monitor_delivery', 'view_student_oversight', 'export_reports'],
  associate_dean: ['load_courses', 'confirm_ai_loading', 'manage_block_sections', 'monitor_faculty', 'monitor_delivery', 'view_student_oversight', 'export_reports'],
  instructor: ['manage_syllabus', 'download_for_approval', 'upload_approved_syllabus', 'extract_outline', 'generate_courseware', 'review_courseware', 'publish_courseware', 'view_scoring_sheet', 'record_scores', 'notify_students'],
  student: ['view_published', 'open_materials', 'answer_assessments', 'view_own_performance'],
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    // Preview personas exist only in development and in the documentation capture build (vite --mode capture).
    if (!import.meta.env.DEV && import.meta.env.MODE !== 'capture') return null
    try {
      const saved = JSON.parse(localStorage.getItem('edupulse_user') || 'null')
      return saved?.demo ? saved : null
    } catch { return null }
  })
  const [authLoading, setAuthLoading] = useState(Boolean(supabase))
  const [roleHistory, setRoleHistory] = useState([])
  const principal = useRef(null), pendingSwitch = useRef(null), pickerVersion=useRef(0)
  const [accountPicker, setAccountPicker] = useState(null)
  const [authRestoreError,setAuthRestoreError]=useState('')
  const currentUser=useRef(user),sessionRef=useRef(null),restoring=useRef({version:0,controller:null,timer:null,ready:false}),signingOut=useRef(false)
  currentUser.current=user
  const publishUser=useCallback(next=>{const value=typeof next==='function'?next(currentUser.current):next;currentUser.current=value;setUser(value)},[])
  const cancelRestore=useCallback(()=>{const state=restoring.current;state.version++;pickerVersion.current++;state.controller?.abort();clearTimeout(state.timer)},[])
  const restoreSession=useCallback(session=>{
    cancelRestore();sessionRef.current=session;principal.current=null
    const state=restoring.current,version=state.version,controller=new AbortController()
    state.controller=controller;state.ready=false
    const valid=()=>restoring.current.version===version&&!controller.signal.aborted
    setAuthLoading(true);setAuthRestoreError('');setAiSubject(undefined);setAccountPicker(null)
    // Leave the Supabase auth callback before starting another auth request.
    state.timer=setTimeout(()=>{void (async()=>{
      let timeout
      try{
        if(!session?.access_token)throw new Error('Sign in again to restore this view.')
        const verified=await Promise.race([supabase.auth.getUser(session.access_token),new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('Session verification timed out.')),20000)})])
        if(!valid())return
        if(verified.error)throw verified.error
        const base=accountUser(verified.data.user)
        principal.current=base
        if(!base){clearAdminView();clearAdminPicker();publishUser(null);setAiAccessToken(undefined);setAuthLoading(false);void supabase.auth.signOut({scope:'local'});return}
        const hint=readAdminView(base)
        let next=base
        if(!base.canSwitchRoles){clearAdminView();clearAdminPicker()}
        if(hint){
          const selected=hint.subjectId?await aiRequest('support','GET',undefined,AbortSignal.any([controller.signal,AbortSignal.timeout(20000)]),{query:{subject:hint.subjectId}}):null
          if(!valid())return
          if(hint.subjectId&&(!selected||selected.id!==hint.subjectId||selected.role!==hint.role))throw new Error('The saved account view changed. Choose the account again from System Admin.')
          next={...base,...(selected||{}),accountId:base.id,accountEmail:base.email,baseRole:base.baseRole,canSwitchRoles:base.canSwitchRoles,role:hint.role,title:ROLE_TITLES[hint.role],supportSubject:selected?.id||null}
          setAiSubject(selected?.id)
        }
        if(!valid())return
        setAccountPicker(readAdminPicker(base));publishUser(next);state.ready=true;setAuthLoading(false)
      }catch(error){
        if(!valid())return
        setAiSubject(undefined);publishUser(null)
        setAuthRestoreError(error.name==='TimeoutError'?'Restoring this view timed out. Retry when connected.':error.message||'The saved account view could not be verified. Retry when connected.')
      }finally{clearTimeout(timeout)}
    })()},0)
  },[cancelRestore,publishUser])
  const returnToAdmin=useCallback(()=>{
    const base=principal.current
    if(!base?.canSwitchRoles)return false
    cancelRestore();clearAdminView();clearAdminPicker();pendingSwitch.current?.(false);pendingSwitch.current=null;setAccountPicker(null);setAiSubject(undefined);publishUser(base);restoring.current.ready=true;setAuthRestoreError('');setAuthLoading(false)
    return true
  },[cancelRestore,publishUser])

  useEffect(() => {
    if (!supabase) return
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if(signingOut.current&&session)return
      setAiAccessToken(session?.access_token)
      const signedInUser = session?.user ? accountUser(session.user) : null
      sessionRef.current=session
      if(!session?.user){
        cancelRestore();principal.current=null;clearAdminView();clearAdminPicker();setAiSubject(undefined);setAuthRestoreError('');restoring.current.ready=false
        pendingSwitch.current?.(false);pendingSwitch.current=null;setAccountPicker(null)
        publishUser(previous=>previous?.authenticated?null:previous);setAuthLoading(false);return
      }
      if(!signedInUser?.canSwitchRoles){setAiSubject(undefined);clearAdminView();clearAdminPicker();pickerVersion.current++;pendingSwitch.current?.(false);pendingSwitch.current=null;setAccountPicker(null)}
      const ready=restoring.current.ready&&principal.current?.id===session.user.id&&principal.current.baseRole===signedInUser?.baseRole&&principal.current.canSwitchRoles===signedInUser?.canSwitchRoles
      if(ready&&event!=='INITIAL_SESSION'){
        principal.current=signedInUser
        publishUser(previous=>previous?.supportSubject?{...previous,canSwitchRoles:true}:accountUser(session.user,previous))
      }else restoreSession(session)
      if (event === 'SIGNED_IN' && session?.user) {
        const marker = `${session.user.id}:${session.user.last_sign_in_at || ''}`
        try{if(signedInUser&&sessionStorage.getItem('edupulse_last_audited_login')!==marker){sessionStorage.setItem('edupulse_last_audited_login',marker);setTimeout(()=>{void recordAudit(signedInUser,'sign_in')},0)}}catch{/* Storage denial must not interrupt session restoration. */}
      }
    })
    return () => {subscription.unsubscribe();cancelRestore()}
  }, [cancelRestore,publishUser,restoreSession])

  const signIn = useCallback(async (email, password) => {
    signingOut.current=false
    if (!supabase) throw new Error('Sign-in is not configured. Contact the EduPulse administrator.')
    if (isSystemAdminEmail(email)) throw new Error('Use Google sign-in for the system admin account.')
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
    if (error) throw new Error('Sign-in failed. Check your email and password.')
    if (!accountUser(data.user)) {
      await supabase.auth.signOut()
      throw new Error('This account has no EduPulse role. Contact the administrator.')
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    signingOut.current=false
    if (!supabase) throw new Error('Google sign-in is not configured.')
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google', options: { redirectTo: `${window.location.origin}${window.location.pathname}` },
    })
    if (error) throw new Error('Google sign-in is unavailable. Contact the EduPulse administrator.')
  }, [])

  const updateProfile = useCallback(async (profile) => {
    if (user?.supportSubject) throw new Error('Return to System Admin to change your account profile or credentials.')
    if (user?.authenticated) {
      const { error } = await supabase.auth.updateUser({ data: { full_name: profile.name, department: profile.department }, ...(profile.password ? { password: profile.password } : {}) })
      if (error) throw new Error('Profile could not be saved. Please try again.')
    }
    setUser(previous => ({ ...previous, name: profile.name, department: profile.department }))
  }, [user])

  useEffect(() => {
    if (user?.demo) localStorage.setItem('edupulse_user', JSON.stringify(user))
    else localStorage.removeItem('edupulse_user')
  }, [user])

  const login = useCallback((persona) => {
    if ((!import.meta.env.DEV && import.meta.env.MODE !== 'capture') || !DEMO_USERS[persona] || user?.authenticated) return
    setAiAccessToken(undefined)
    setUser({ ...DEMO_USERS[persona], demo: true })
    setRoleHistory(prev => [...prev, { action: 'login', persona, timestamp: new Date().toISOString() }])
  }, [user])

  const logout = useCallback(async () => {
    signingOut.current=true;cancelRestore();clearAdminView();clearAdminPicker();pendingSwitch.current?.(false);pendingSwitch.current=null;setAccountPicker(null);setAuthLoading(true);setAuthRestoreError('')
    try {
      if (user?.supportSubject) await aiRequest('support', 'POST', { id: user.supportSubject, operation: 'leave' }).catch(() => {})
      setAiSubject(undefined)
      await recordAudit(principal.current || user, 'sign_out')
      // Clear only the device cookie. Explicit Disconnect removes the saved key.
      await aiRequest('providers', 'DELETE', undefined, undefined, { query: { sessionOnly: 'true' } }).catch(() => {})
    } finally {
      try { await supabase?.auth.signOut({ scope: 'local' }) } finally {
        setAiAccessToken(undefined);setAiSubject(undefined);sessionRef.current=null
        setRoleHistory(prev => [...prev, { action: 'logout', role: user?.role, timestamp: new Date().toISOString() }])
        pendingSwitch.current?.(false);pendingSwitch.current=null;setAccountPicker(null)
        principal.current=null;publishUser(null);restoring.current.ready=false;signingOut.current=false;setAuthLoading(false)
      }
    }
  }, [user,cancelRestore,publishUser])

  const closePicker = useCallback(() => { pickerVersion.current++;clearAdminPicker();pendingSwitch.current?.(false); pendingSwitch.current = null; setAccountPicker(null) }, [])
  const selectAccount = useCallback(async (account) => {
    const base = principal.current,role=accountPicker,version=restoring.current.version,selection=pickerVersion.current
    const valid=()=>!signingOut.current&&restoring.current.ready&&restoring.current.version===version&&pickerVersion.current===selection&&principal.current?.id===base?.id&&canSwitchRole(principal.current,role)
    if (!valid()) throw new Error('Sign in again as the system admin.')
    const selected = account ? await aiRequest('support', 'POST', { id: account.id, operation: 'enter' }) : null
    if(!valid())throw new Error('The account session changed. Reopen account selection.')
    if(account&&(!selected||selected.id!==account.id||selected.role!==role))throw new Error('This account changed roles. Reopen account selection.')
    if (user?.supportSubject && !selected) await aiRequest('support', 'POST', { id: user.supportSubject, operation: 'leave' })
    if(!valid())throw new Error('The account session changed. Reopen account selection.')
    setAiSubject(selected?.id)
    cancelRestore();restoring.current.ready=true
    clearAdminPicker();saveAdminView(base,role,selected?.id||null)
    publishUser({ ...base, ...(selected || {}), accountId: base.id, accountEmail: base.email,baseRole:base.baseRole,canSwitchRoles:base.canSwitchRoles,role, title: ROLE_TITLES[role], supportSubject: selected?.id || null })
    setRoleHistory(previous => [...previous, { action: 'role_switch', to: role, subject: selected?.id || base.id, timestamp: new Date().toISOString() }])
    if (!selected) void recordAudit(base, 'view_switch', 'success', ROLE_TITLES[role])
    pendingSwitch.current?.(true); pendingSwitch.current = null; setAccountPicker(null)
  }, [accountPicker, user?.supportSubject,cancelRestore,publishUser])
  const switchRole = useCallback(async (role) => {
    if (!canSwitchRole(user, role)) return false
    if (role === 'admin') {
      const base=principal.current
      cancelRestore();clearAdminView();closePicker();restoring.current.ready=true
      const version=restoring.current.version,selection=pickerVersion.current
      if (user?.supportSubject) await aiRequest('support', 'POST', { id: user.supportSubject, operation: 'leave' }).catch(() => recordAudit(principal.current, 'view_switch', 'failure', 'Support exit audit unavailable; returned to admin locally'))
      if(signingOut.current||restoring.current.version!==version||pickerVersion.current!==selection||principal.current?.id!==base?.id||!canSwitchRole(principal.current,'admin'))return false
      setAiSubject(undefined); publishUser(principal.current); return true
    }
    pendingSwitch.current?.(false)
    pickerVersion.current++;saveAdminPicker(principal.current,role)
    setAccountPicker(role)
    return new Promise(resolve => { pendingSwitch.current = resolve })
  }, [user, closePicker,cancelRestore,publishUser])

  const hasPermission = useCallback((permission) => Boolean(user && ROLE_PERMISSIONS[user.role]?.includes(permission)), [user])
  const canAccess = useCallback((requiredRoles) => Boolean(user && (requiredRoles === 'all' || requiredRoles.includes(user.role))), [user])

  return (
    <AuthContext.Provider value={{ user, login, signIn, signInWithGoogle, logout, updateProfile, authLoading, authRestoreError, retryRestoration:()=>restoreSession(sessionRef.current), returnToAdmin, canReturnToAdmin:Boolean(principal.current?.canSwitchRoles), switchRole, hasPermission, canAccess, roleHistory, ROLE_PERMISSIONS }}>
      {children}
      {!authLoading && accountPicker && user?.canSwitchRoles && <AccountSwitchModal key={accountPicker} role={accountPicker} onSelect={selectAccount} onClose={closePicker} />}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
