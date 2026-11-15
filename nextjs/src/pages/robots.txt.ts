import type { NextApiRequest, NextApiResponse } from 'next'

const SITE_URL = 'https://aytan-six.vercel.app'

export default function handler(_req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  res.status(200).send(`User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin
Disallow: /profile
Disallow: /settings
Disallow: /inbox
Disallow: /conversation
Disallow: /notifications
Disallow: /friends
Disallow: /feed
Disallow: /forums
Disallow: /forum
Disallow: /questions
Disallow: /stories
Disallow: /communities
Disallow: /search

Sitemap: ${SITE_URL}/sitemap.xml
`)
}
