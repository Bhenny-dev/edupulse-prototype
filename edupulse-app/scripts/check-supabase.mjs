const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL
const publishableKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !publishableKey) {
  throw new Error('Supabase URL and publishable key are required for the connection check.')
}

const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
  headers: { apikey: publishableKey },
})

if (!response.ok) {
  throw new Error(`Supabase connection failed with HTTP ${response.status}.`)
}

console.log(`Supabase connection succeeded (HTTP ${response.status}).`)
