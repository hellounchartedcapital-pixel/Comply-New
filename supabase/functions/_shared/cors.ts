// Shared CORS configuration for edge functions
// Uses environment variable for allowed origins in production

/**
 * Get allowed origins from environment
 * In production, set ALLOWED_ORIGINS to your domain(s)
 * Example: "https://yourdomain.com,https://www.yourdomain.com"
 */
function getAllowedOrigins(): string[] {
  const originsEnv = Deno.env.get('ALLOWED_ORIGINS');
  if (originsEnv) {
    return originsEnv.split(',').map(o => o.trim());
  }
  // Default to allowing localhost for development
  return [
    'http://localhost:3000',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:5173'
  ];
}

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;

  const allowedOrigins = getAllowedOrigins();

  // Check for wildcard (not recommended for production)
  if (allowedOrigins.includes('*')) return true;

  // Check if origin matches any allowed origin
  return allowedOrigins.some(allowed => {
    // Support wildcard subdomains like *.vercel.app
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      return origin.endsWith(domain) || origin.endsWith('.' + domain);
    }
    return origin === allowed;
  });
}

/**
 * Get CORS headers for a request
 * Returns appropriate headers based on the request origin
 */
export function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin');
  const allowedOrigins = getAllowedOrigins();

  // If wildcard is set, allow all (for development only)
  if (allowedOrigins.includes('*')) {
    return {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
    };
  }

  // Check if the origin is allowed
  if (origin && isOriginAllowed(origin)) {
    return {
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Credentials': 'true',
    };
  }

  // If origin is not allowed, return restricted headers
  // The first allowed origin is used as a fallback
  return {
    'Access-Control-Allow-Origin': allowedOrigins[0] || 'null',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
  };
}

/**
 * Handle CORS preflight request
 */
export function handleCorsPreflightRequest(req: Request): Response {
  return new Response(null, {
    status: 204,
    headers: getCorsHeaders(req),
  });
}
