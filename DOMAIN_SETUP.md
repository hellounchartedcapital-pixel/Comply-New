# SmartCOI.io Domain Setup Guide

Complete instructions for connecting your smartcoi.io domain to Vercel.

## Step 1: Add Domain in Vercel Dashboard

1. Go to your Vercel dashboard: https://vercel.com/dashboard
2. Select your Comply project
3. Click "Settings" → "Domains"
4. Click "Add Domain"
5. Enter: `smartcoi.io`
6. Click "Add"

Vercel will show you DNS records to configure.

## Step 2: Configure DNS Records

You'll need to add these DNS records at your domain registrar (where you bought smartcoi.io):

### For Root Domain (smartcoi.io)

**Option A: A Records (Recommended)**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: Auto or 3600
```

**Option B: CNAME to Vercel (if registrar supports CNAME flattening)**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: Auto or 3600
```

### For www Subdomain (www.smartcoi.io)

```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Auto or 3600
```

## Step 3: Where to Add DNS Records

Find your domain registrar (where you purchased smartcoi.io):

### Common Registrars

**GoDaddy:**
1. Login → My Products → Domain → DNS
2. Add Records → Select Type → Fill values → Save

**Namecheap:**
1. Domain List → Manage → Advanced DNS
2. Add New Record → Fill values → Save

**Google Domains:**
1. My Domains → Manage → DNS
2. Custom records → Create new record → Save

**Cloudflare:**
1. Select domain → DNS → Add record
2. Note: Disable proxy (gray cloud) for initial setup
3. After verification, can enable proxy (orange cloud)

**Name.com:**
1. Domain Manager → DNS Records
2. Add Record → Fill values → Submit

## Step 4: Verify Domain

1. After adding DNS records, return to Vercel
2. Click "Refresh" or wait for automatic verification
3. DNS propagation can take 5 minutes to 48 hours (usually under 1 hour)
4. Vercel will show "Valid Configuration" when ready

## Step 5: Set Primary Domain

1. In Vercel Domains settings
2. Find `smartcoi.io`
3. Click "..." → "Set as Primary Domain"
4. This makes smartcoi.io your canonical URL

## Step 6: SSL Certificate

Vercel automatically provisions SSL certificates:
- Usually ready within 5-10 minutes after DNS verification
- Your site will be accessible via https://smartcoi.io
- Automatic renewal before expiration

## Troubleshooting

### DNS Not Propagating
```bash
# Check DNS propagation status
dig smartcoi.io
dig www.smartcoi.io

# Or use online tools
# https://dnschecker.org
```

### Domain Shows "Pending Verification"
- Wait 10-15 minutes for DNS propagation
- Click "Refresh" in Vercel dashboard
- Verify DNS records are correct (no typos)
- Some registrars have "DNS propagation delay" - can take 1-2 hours

### SSL Certificate Not Issuing
- Ensure DNS is fully propagated first
- Check that CAA records (if any) allow Let's Encrypt
- Wait 10-15 minutes after DNS verification

### Common Mistakes
- ❌ Adding `http://` or `https://` to CNAME value
- ❌ Adding trailing dot to CNAME value (some registrars auto-add this)
- ❌ Using proxy/CDN before initial verification (Cloudflare users)
- ❌ Mixing A records and CNAME for same hostname

## Environment Variables

After domain is connected, verify these are set in Vercel:

```
REACT_APP_SUPABASE_URL=your-project-url
REACT_APP_SUPABASE_ANON_KEY=your-anon-key
REACT_APP_ANTHROPIC_API_KEY=your-anthropic-key
```

**To add in Vercel:**
1. Settings → Environment Variables
2. Add each variable for Production, Preview, and Development
3. Redeploy after adding variables

## Redirects (Recommended)

Add www → non-www redirect in `vercel.json`:

```json
{
  "redirects": [
    {
      "source": "/:path*",
      "has": [
        {
          "type": "host",
          "value": "www.smartcoi.io"
        }
      ],
      "destination": "https://smartcoi.io/:path*",
      "permanent": true
    }
  ]
}
```

## Testing Checklist

After domain is live:

- [ ] https://smartcoi.io loads correctly
- [ ] https://www.smartcoi.io redirects to smartcoi.io
- [ ] SSL certificate shows valid (lock icon)
- [ ] All pages accessible (login, signup, dashboard)
- [ ] No mixed content warnings
- [ ] Favicon displays correctly
- [ ] Meta tags show correct domain

## Quick Reference

**Vercel DNS Records:**
- A Record: `76.76.21.21`
- CNAME: `cname.vercel-dns.com`

**Support:**
- Vercel Docs: https://vercel.com/docs/concepts/projects/domains
- Vercel Discord: https://vercel.com/discord
