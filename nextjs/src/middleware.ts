import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  const response = NextResponse.next()
  const hostname = request.headers.get('host')?.split(':')[0]?.toLowerCase()

  // Keep every Vercel deployment accessible, but let Google index Railway only.
  if (hostname?.endsWith('.vercel.app')) {
    response.headers.set('X-Robots-Tag', 'noindex, follow')
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)'],
}
