import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import Anthropic from 'npm:@anthropic-ai/sdk@0.52.0';
import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/cors.ts';

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 10; // 10 requests per minute

// In-memory rate limit store (resets on cold start, but provides basic protection)
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(req: Request): string {
  // Use X-Forwarded-For header (set by Supabase) or fall back to a default
  const forwardedFor = req.headers.get('x-forwarded-for');
  const clientIp = forwardedFor?.split(',')[0]?.trim() || 'unknown';

  // Also include authorization to rate limit per user
  const authHeader = req.headers.get('authorization') || '';
  return `${clientIp}:${authHeader.slice(-20)}`;
}

function checkRateLimit(key: string): { allowed: boolean; remaining: number; resetIn: number } {
  const now = Date.now();
  const record = rateLimitStore.get(key);

  // Clean up expired entries periodically
  if (rateLimitStore.size > 1000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!record || now > record.resetTime) {
    // Start new window
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }

  record.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count, resetIn: record.resetTime - now };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req);
  }

  const corsHeaders = getCorsHeaders(req);

  // Check rate limit
  const rateLimitKey = getRateLimitKey(req);
  const rateLimit = checkRateLimit(rateLimitKey);

  const rateLimitHeaders = {
    'X-RateLimit-Limit': MAX_REQUESTS_PER_WINDOW.toString(),
    'X-RateLimit-Remaining': rateLimit.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(rateLimit.resetIn / 1000).toString(),
  };

  if (!rateLimit.allowed) {
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Rate limit exceeded. Please wait before making more requests.',
        retryAfter: Math.ceil(rateLimit.resetIn / 1000),
      }),
      {
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        status: 429,
      }
    );
  }

  try {
    const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY');
    if (!ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }

    const { pdfBase64 } = await req.json();

    if (!pdfBase64) {
      throw new Error('No PDF data provided');
    }

    const anthropic = new Anthropic({
      apiKey: ANTHROPIC_API_KEY,
    });

    // Call Claude API
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'document',
              source: {
                type: 'base64',
                media_type: 'application/pdf',
                data: pdfBase64,
              },
            },
            {
              type: 'text',
              text: `You are an insurance compliance expert. Analyze this document and extract ALL insurance requirements.

This could be:
- A lease agreement with insurance clauses
- A vendor requirements document
- An insurance specifications sheet
- A sample Certificate of Insurance (COI)
- A compliance guidelines document

Extract the following insurance requirements (if mentioned):

1. General Liability Insurance
   - Minimum coverage amount (per occurrence)
   - Aggregate amount (if specified)

2. Automobile Liability Insurance
   - Minimum coverage amount
   - Type (owned, hired, non-owned)

3. Workers' Compensation Insurance
   - Required? (Yes/No/Statutory)
   - Minimum amount (if specified, otherwise "Statutory")

4. Employers Liability Insurance
   - Minimum coverage amount

5. Additional Insurance Types (if mentioned):
   - Professional Liability / E&O
   - Cyber Liability
   - Umbrella / Excess Liability
   - Pollution Liability
   - Liquor Liability
   - Any other specialty insurance

6. Additional Requirements (if mentioned):
   - Additional Insured requirement
   - Waiver of Subrogation
   - Primary and Non-Contributory
   - Notice of Cancellation (30 days, 60 days, etc.)
   - Certificate Holder information

IMPORTANT INSTRUCTIONS:
- Only extract requirements that are EXPLICITLY stated
- If a coverage is not mentioned, mark it as null
- For amounts, extract the number only (e.g., 1000000 for $1,000,000)
- For "Statutory" workers comp, return the string "Statutory"
- Include confidence level: high (90-100%), medium (70-89%), low (below 70%)
- If you're unsure about a value, mark confidence as "medium" or "low"

Return ONLY valid JSON in this exact format:
{
  "requirements": {
    "general_liability": {
      "amount": <number or null>,
      "aggregate": <number or null>,
      "required": <boolean>,
      "confidence": "high" | "medium" | "low"
    },
    "auto_liability": {
      "amount": <number or null>,
      "required": <boolean>,
      "confidence": "high" | "medium" | "low"
    },
    "workers_comp": {
      "amount": "Statutory" | <number> | null,
      "required": <boolean>,
      "confidence": "high" | "medium" | "low"
    },
    "employers_liability": {
      "amount": <number or null>,
      "required": <boolean>,
      "confidence": "high" | "medium" | "low"
    },
    "additional_coverages": [
      {
        "type": "Professional Liability" | "Cyber Liability" | "Umbrella" | etc.,
        "amount": <number or null>,
        "required": <boolean>,
        "confidence": "high" | "medium" | "low"
      }
    ],
    "special_requirements": {
      "additional_insured": <boolean or null>,
      "waiver_of_subrogation": <boolean or null>,
      "primary_non_contributory": <boolean or null>,
      "notice_of_cancellation_days": <number or null>
    }
  },
  "source_document_type": "lease" | "vendor_requirements" | "sample_coi" | "guidelines" | "unknown",
  "extraction_notes": "Brief notes about what was found or any uncertainties"
}`
            }
          ]
        }
      ]
    });

    // Parse response
    const responseText = message.content[0].type === 'text' ? message.content[0].text : '';
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);

    if (!jsonMatch) {
      throw new Error('Could not parse AI response as JSON');
    }

    const extractedData = JSON.parse(jsonMatch[0]);

    return new Response(
      JSON.stringify({
        success: true,
        data: extractedData,
        raw_response: responseText
      }),
      {
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Extraction error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || 'Failed to extract requirements',
        data: null
      }),
      {
        headers: { ...corsHeaders, ...rateLimitHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
