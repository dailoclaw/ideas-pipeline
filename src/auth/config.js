export function configureSupabase(createClient, url, key) {
  try {
    const parsed = new URL(url)
    const localHttp = parsed.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname)
    if ((parsed.protocol !== 'https:' && !localHttp) || !key?.trim()) throw new Error('Invalid settings')
    return {
      client: createClient(url, key, {
        auth: { persistSession: false, detectSessionInUrl: false, autoRefreshToken: true },
      }),
      error: '',
    }
  } catch {
    return { client: null, error: 'Set a valid Supabase HTTPS URL and public key in the application environment before signing in.' }
  }
}
