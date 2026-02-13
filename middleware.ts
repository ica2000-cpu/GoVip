import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Exclude static files and admin routes from any custom logic
  if (
    pathname.startsWith('/_next') || 
    pathname.startsWith('/static') || 
    pathname.startsWith('/api') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/auth') || // Allow auth routes
    pathname.includes('.') // Exclude files like favicon.ico, logo.png
  ) {
    return NextResponse.next();
  }

  // 2. Handle root path redirection in middleware (optional, but robust)
  // Although app/page.tsx already handles this, middleware can be faster.
  // However, since app/page.tsx does it, we can just let it pass through.
  
  // The user reported "Fix 404: Middleware or dynamic routes capturing routes they shouldn't".
  // The issue might be that [slug] catches everything.
  // In Next.js App Router, [slug] at root (app/[slug]/page.tsx) WILL catch everything 
  // that isn't matched by a specific folder (like /admin).
  // So /favicon.ico might be caught by [slug] if not handled.
  
  // Since we excluded '.' files above, this should protect assets.
  
  return NextResponse.next();
}

export const config = {
  // Match all paths except static files and api
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
