// ========================================
// 🛡️ ENTERPRISE SECURITY MIDDLEWARE
// ========================================
// Rate Limiting | Security Headers | OWASP ASVS L2
// ========================================

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// =====================================================
// 🔐 RATE LIMIT CONFIGURATION
// =====================================================
interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

const RATE_LIMITS: Record<string, RateLimitConfig> = {
  '/api/checkout': { maxRequests: 10, windowMs: 60 * 1000 }, // 10 req/min
  '/api/webhooks': { maxRequests: 100, windowMs: 60 * 1000 }, // 100 req/min
  '/api/admin': { maxRequests: 30, windowMs: 60 * 1000 }, // 30 req/min
  default: { maxRequests: 60, windowMs: 60 * 1000 }, // 60 req/min
};

// In-memory store (substituir por Redis em produção)
const requestCounts = new Map<string, { count: number; resetAt: number }>();

// =====================================================
// 🔒 SECURITY HEADERS (OWASP Recommendations)
// =====================================================
function setSecurityHeaders(response: NextResponse): NextResponse {
  // HSTS (Force HTTPS)
  response.headers.set(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  
  // Previne MIME Sniffing
  response.headers.set('X-Content-Type-Options', 'nosniff');
  
  // Previne Clickjacking
  response.headers.set('X-Frame-Options', 'DENY');
  
  // XSS Protection (Legacy browsers)
  response.headers.set('X-XSS-Protection', '1; mode=block');
  
  // Content Security Policy
  response.headers.set(
    'Content-Security-Policy',
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://sdk.mercadopago.com https://challenges.cloudflare.com https://www.googletagmanager.com https://connect.facebook.net",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://*.supabase.co https://api.mercadopago.com https://api.mercadopago.com.br https://*.mercadolibre.com https://*.mercadopago.com https://api.appmax.com.br https://www.google-analytics.com",
      "frame-src 'self' https://challenges.cloudflare.com https://www.mercadolibre.com https://*.mercadolibre.com",
    ].join('; ')
  );
  
  // Permissions Policy (Feature Policy)
  response.headers.set(
    'Permissions-Policy',
    'camera=(), microphone=(), geolocation=()'
  );
  
  // Referrer Policy
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

// =====================================================
// ⏱️ RATE LIMITING FUNCTION
// =====================================================
function checkRateLimit(
  request: NextRequest,
  config: RateLimitConfig
): { allowed: boolean; resetAt?: number; remaining?: number } {
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
             request.headers.get('x-real-ip') || 
             'unknown';
  
  const key = `${ip}:${request.nextUrl.pathname}`;
  const now = Date.now();
  
  const record = requestCounts.get(key);
  
  if (!record || now > record.resetAt) {
    // Nova janela de tempo
    requestCounts.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });
    return { allowed: true, remaining: config.maxRequests - 1 };
  }
  
  if (record.count >= config.maxRequests) {
    return {
      allowed: false,
      resetAt: record.resetAt,
      remaining: 0,
    };
  }
  
  record.count++;
  return {
    allowed: true,
    remaining: config.maxRequests - record.count,
  };
}

// =====================================================
// 🔍 IP VALIDATION (Previne SSRF)
// =====================================================
function isPrivateIP(ip: string): boolean {
  const privateRanges = [
    /^127\./, // Loopback
    /^10\./, // Class A private
    /^172\.(1[6-9]|2\d|3[01])\./, // Class B private
    /^192\.168\./, // Class C private
    /^169\.254\./, // Link-local
    /^::1$/, // IPv6 loopback
    /^fe80:/, // IPv6 link-local
  ];
  
  return privateRanges.some((regex) => regex.test(ip));
}

// =====================================================
// 🔐 AUTHENTICATION CHECK
// =====================================================
async function checkAuth(request: NextRequest): Promise<{
  authenticated: boolean;
  user?: any;
  isAdmin?: boolean;
}> {
  try {
    const token = request.cookies.get('sb-access-token')?.value;
    
    if (!token) {
      return { authenticated: false };
    }
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim()!;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim()!;
    
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    });
    
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error || !user) {
      return { authenticated: false };
    }
    
    const isAdmin = user.user_metadata?.role === 'admin';
    
    return { authenticated: true, user, isAdmin };
  } catch (error) {
    console.error('Auth check failed:', error);
    return { authenticated: false };
  }
}

// =====================================================
// 🛡️ MAIN MIDDLEWARE
// =====================================================
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // ==================================================
  // 1️⃣ RATE LIMITING
  // ==================================================
  const rateLimitConfig = 
    Object.entries(RATE_LIMITS).find(([path]) => pathname.startsWith(path))?.[1] ||
    RATE_LIMITS.default;
  
  const rateLimitResult = checkRateLimit(request, rateLimitConfig);
  
  if (!rateLimitResult.allowed) {
    const retryAfter = Math.ceil(
      ((rateLimitResult.resetAt || Date.now()) - Date.now()) / 1000
    );
    
    return new NextResponse(
      JSON.stringify({
        error: 'Rate limit exceeded',
        message: 'Too many requests. Please try again later.',
        retryAfter,
      }),
      {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': rateLimitConfig.maxRequests.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (rateLimitResult.resetAt || Date.now()).toString(),
        },
      }
    );
  }
  
  // ==================================================
  // 2️⃣ IP VALIDATION (Previne SSRF em webhooks)
  // ==================================================
  if (pathname.startsWith('/api/webhooks')) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0] || 
               request.headers.get('x-real-ip');
    
    if (ip && isPrivateIP(ip)) {
      return new NextResponse(
        JSON.stringify({ error: 'Invalid request origin' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  
  // ==================================================
  // 3️⃣ ADMIN PROTECTION
  // ==================================================
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const authResult = await checkAuth(request);
    
    if (!authResult.authenticated) {
      // Redireciona para login se não autenticado
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    
    if (!authResult.isAdmin) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized', message: 'Admin access required' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  
  // ==================================================
  // 4️⃣ WEBHOOK SIGNATURE VALIDATION (Pré-check)
  // ==================================================
  if (pathname.startsWith('/api/webhooks/mercadopago')) {
    const signature = request.headers.get('x-signature');
    const requestId = request.headers.get('x-request-id');
    
    if (!signature || !requestId) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing webhook signature' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
  
  // ==================================================
  // 5️⃣ CREATE RESPONSE & ADD SECURITY HEADERS
  // ==================================================
  const response = NextResponse.next();
  
  // Adiciona headers de segurança
  const secureResponse = setSecurityHeaders(response);
  
  // Adiciona rate limit headers
  secureResponse.headers.set(
    'X-RateLimit-Limit',
    rateLimitConfig.maxRequests.toString()
  );
  secureResponse.headers.set(
    'X-RateLimit-Remaining',
    (rateLimitResult.remaining || 0).toString()
  );
  
  return secureResponse;
}

// =====================================================
// 🎯 MATCHER CONFIG
// =====================================================
export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico (favicon)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
