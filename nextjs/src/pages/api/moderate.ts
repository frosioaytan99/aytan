// API route to forward moderation requests to Supabase Edge Function using SERVICE_ROLE_KEY
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') return res.status(405).end()
  const { message_id } = req.body
  if (!message_id) return res.status(400).json({ error: 'missing message_id' })

  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL
  const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY
  if (!SUPABASE_URL || !SERVICE_KEY) return res.status(500).json({ error: 'server not configured' })

  try {
    const fnUrl = `${SUPABASE_URL.replace(/\/+$/,'')}/functions/v1/moderate`
    const r = await fetch(fnUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SERVICE_KEY}`
      },
      body: JSON.stringify({ message_id })
    })

    const json = await r.text()
    return res.status(r.status).send(json)
  } catch (err) {
    return res.status(500).json({ error: String(err) })
  }
}
