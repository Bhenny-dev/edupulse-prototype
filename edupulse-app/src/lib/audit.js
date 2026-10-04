import { supabase } from './supabaseClient'

/** A best-effort activity record. Never include passwords, tokens, keys or prompts. */
export async function recordAudit(user, action, outcome = 'success', detail = '') {
  if (!supabase || !user?.authenticated || !user.id || !user.baseRole) return
  await supabase.from('edupulse_audit_events').insert({
    actor_id: user.id,
    actor_role: user.baseRole,
    action,
    outcome,
    detail: String(detail).slice(0, 160),
  }).then(() => {}, () => {})
}
