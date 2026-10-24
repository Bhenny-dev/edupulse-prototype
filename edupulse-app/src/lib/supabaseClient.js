import { createClient } from '@supabase/supabase-js'
import { providerAuthorizationReturn } from './providerOAuth'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const supabase = supabaseUrl && supabasePublishableKey ? createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    autoRefreshToken: true,
    // Provider authorization codes belong to the provider, not Supabase sign-in.
    detectSessionInUrl: !providerAuthorizationReturn(new URL(window.location.href)),
    persistSession: true,
  },
}) : null
