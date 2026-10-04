import { withSupabase } from 'npm:@supabase/server@1.4.1'

const OWNER_EMAIL = 'riverabenlor461@gmail.com'
const assignable = new Set(['dean', 'associate_dean', 'instructor', 'student'])
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default {
  fetch: withSupabase({ auth: 'user' }, async (request, ctx) => {
    if (request.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 })
    const { data: { user: caller }, error: callerError } = await ctx.supabase.auth.getUser()
    if (callerError || !caller || caller.id !== ctx.userClaims?.id ||
        caller.email?.toLowerCase() !== OWNER_EMAIL || caller.app_metadata?.role !== 'admin' ||
        !caller.identities?.some(identity => identity.provider === 'google')) {
      return Response.json({ error: 'System admin required' }, { status: 403 })
    }

    let input: Record<string, unknown>
    try { input = await request.json() } catch { return Response.json({ error: 'Invalid request' }, { status: 400 }) }
    const role = String(input.role || '')
    if (!assignable.has(role)) return Response.json({ error: 'Choose a permitted role' }, { status: 400 })

    if (input.action === 'create') {
      const email = String(input.email || '').trim().toLowerCase()
      const password = String(input.password || '')
      const name = String(input.name || '').trim().slice(0, 100)
      if (!emailPattern.test(email) || email === OWNER_EMAIL || password.length < 12 || password.length > 128) {
        return Response.json({ error: 'Use a valid email and a password of 12–128 characters' }, { status: 400 })
      }
      const { data, error } = await ctx.supabaseAdmin.auth.admin.createUser({
        email, password, email_confirm: true,
        app_metadata: { role }, user_metadata: { full_name: name || role.replace('_', ' ') },
      })
      if (error) return Response.json({ error: 'Account could not be created' }, { status: 400 })
      await ctx.supabaseAdmin.from('edupulse_audit_events').insert({ actor_id: caller.id, actor_role: 'admin', action: 'role_change', outcome: 'success', detail: `Created ${role} account` })
      return Response.json({ id: data.user.id, role }, { status: 201 })
    }

    if (input.action === 'assign') {
      const userId = String(input.userId || '')
      if (!/^[0-9a-f]{8}-[0-9a-f-]{27,36}$/i.test(userId) || userId === caller.id) return Response.json({ error: 'Invalid account' }, { status: 400 })
      const { data: target, error: lookupError } = await ctx.supabaseAdmin.auth.admin.getUserById(userId)
      if (lookupError || !target.user || target.user.app_metadata?.role === 'admin' || target.user.email?.toLowerCase() === OWNER_EMAIL) {
        return Response.json({ error: 'Account cannot be changed' }, { status: 403 })
      }
      const { error } = await ctx.supabaseAdmin.auth.admin.updateUserById(userId, { app_metadata: { ...target.user.app_metadata, role } })
      if (error) return Response.json({ error: 'Role could not be saved' }, { status: 400 })
      await ctx.supabaseAdmin.from('edupulse_audit_events').insert({ actor_id: caller.id, actor_role: 'admin', action: 'role_change', outcome: 'success', detail: `Assigned ${role} role` })
      return Response.json({ id: userId, role })
    }

    return Response.json({ error: 'Unknown action' }, { status: 400 })
  }),
}
