import { createClient } from 'npm:@supabase/supabase-js@2'

// 🌍 Environment variables
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')! // for getUser
const ORIGIN = Deno.env.get('FUNCTION_ALLOWED_ORIGIN') ?? '*'

// 🌐 CORS headers
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

// Helper: extract Bearer token
function getToken(req: Request): string {
  const authHeader = req.headers.get('authorization') || ''
  if (!authHeader.toLowerCase().startsWith('bearer '))
    throw new Error('Missing Authorization header')
  return authHeader.split(' ')[1].trim()
}

// ✅ Edge function
Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS_HEADERS })

  try {
    // 1️⃣ Verify user via Supabase internal auth
    const token = getToken(req)
    const client = createClient(SUPABASE_URL, ANON_KEY)
    const { data: userData, error: userErr } = await client.auth.getUser(token)

    if (userErr || !userData.user)
      return new Response(
        JSON.stringify({ error: 'Invalid JWT', details: userErr?.message }),
        { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      )

    const userId = userData.user.id

    // 2️⃣ Admin client for deletion
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY)
    const warnings: string[] = []

    // Delete from custom tables
    await admin.from('user_favourites').delete().eq('user_id', userId)
    await admin.from('user_settings').delete().eq('user_id', userId)

    // Delete files from storage
    const bucket = 'user-uploads'
    const { data: files } = await admin.storage.from(bucket).list(`${userId}`)
    if (files?.length) {
      const paths = files.map(f => `${userId}/${f.name}`)
      await admin.storage.from(bucket).remove(paths)
    }

    // Delete auth user
    const { error: delErr } = await admin.auth.admin.deleteUser(userId)
    if (delErr) warnings.push(`auth: ${delErr.message}`)

    // ✅ Success response
    return new Response(
      JSON.stringify({ status: 'ok', deleted_user: userId, warnings }),
      { status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  } catch (err) {
    console.error('delete-user error:', err)
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 401, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    )
  }
})