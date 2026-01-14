# SmartCOI Launch Checklist

Pre-launch verification for smartcoi.io deployment.

## 1. Code & Branding ✅

- [x] Updated all "comply" references to "SmartCOI"
- [x] Created 4 logo concept variations
- [x] Added favicon.svg
- [x] Updated index.html meta tags for SEO
- [x] Updated Open Graph tags for social sharing
- [x] Updated Twitter Card tags
- [x] Changed site title to "SmartCOI - AI-Powered Certificate of Insurance Tracking"
- [x] Updated all component headers (Landing, Login, Signup, Dashboard)
- [x] Created vercel.json deployment config

## 2. Environment Variables (Required)

Before deploying to Vercel, ensure these are set:

### Supabase Configuration
```
REACT_APP_SUPABASE_URL=your-supabase-project-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
```

### Anthropic AI Configuration
```
REACT_APP_ANTHROPIC_API_KEY=your-anthropic-api-key
```

**Where to add in Vercel:**
1. Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add each variable for: Production, Preview, Development
3. Click "Save"
4. Redeploy after adding variables

## 3. Supabase Backend Checklist

Verify these are configured in your Supabase project:

### Database Tables
- [ ] `vendors` table exists with proper columns
- [ ] `settings` table exists with proper columns
- [ ] Row Level Security (RLS) policies enabled
- [ ] RLS policies allow authenticated users to access their own data

### Authentication
- [ ] Email authentication enabled
- [ ] Email confirmation settings configured (optional)
- [ ] Password reset email template configured

### Storage
- [ ] `coi-documents` storage bucket created
- [ ] Bucket is private (requires authentication)
- [ ] Storage policies allow authenticated users to upload/read their files
- [ ] File size limit set (recommend 5MB max for PDFs)

### Database Schema
Run these if not already created:

```sql
-- Vendors table
CREATE TABLE IF NOT EXISTS vendors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  dba TEXT,
  status TEXT,
  expiration_date DATE,
  days_overdue INTEGER,
  coverage JSONB,
  issues JSONB,
  raw_data JSONB,
  requirements JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Settings table
CREATE TABLE IF NOT EXISTS settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  general_liability NUMERIC,
  auto_liability NUMERIC,
  workers_comp TEXT,
  employers_liability NUMERIC,
  additional_requirements JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendors
CREATE POLICY "Users can view their own vendors"
  ON vendors FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own vendors"
  ON vendors FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own vendors"
  ON vendors FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own vendors"
  ON vendors FOR DELETE
  USING (auth.uid() = user_id);

-- RLS Policies for settings
CREATE POLICY "Users can view their own settings"
  ON settings FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own settings"
  ON settings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings"
  ON settings FOR UPDATE
  USING (auth.uid() = user_id);
```

## 4. Domain Setup

Follow steps in `DOMAIN_SETUP.md`:

- [ ] Add smartcoi.io domain in Vercel dashboard
- [ ] Configure DNS records at domain registrar
  - [ ] A record: @ → 76.76.21.21
  - [ ] CNAME: www → cname.vercel-dns.com
- [ ] Wait for DNS propagation (5-60 minutes)
- [ ] Verify domain in Vercel (check for "Valid Configuration")
- [ ] Set smartcoi.io as primary domain
- [ ] Confirm SSL certificate issued (https works)

## 5. Build & Deploy Testing

### Local Build Test
```bash
npm install
npm run build
```

- [ ] Build completes without errors
- [ ] No TypeScript errors
- [ ] No console warnings (critical ones)
- [ ] Build size is reasonable (<2MB recommended)

### Deploy to Vercel
```bash
# Option 1: Connect GitHub repo in Vercel dashboard (Recommended)
# Option 2: Use Vercel CLI
npm i -g vercel
vercel --prod
```

- [ ] Deployment succeeds
- [ ] All environment variables are set
- [ ] Build logs show no errors

## 6. Post-Deployment Testing

After deploying to Vercel, test these on the live site:

### Landing Page
- [ ] https://smartcoi.io loads correctly
- [ ] All sections visible (hero, pain points, features, social proof, CTA)
- [ ] "Get Started" buttons work
- [ ] Logo displays correctly
- [ ] Favicon shows in browser tab
- [ ] Mobile responsive layout works
- [ ] No console errors

### Authentication
- [ ] Signup flow works
  - [ ] Can create new account
  - [ ] Email validation works
  - [ ] Password validation works (min 6 chars)
  - [ ] Redirects to dashboard after signup
- [ ] Login flow works
  - [ ] Can sign in with email/password
  - [ ] Error messages display for wrong credentials
  - [ ] Redirects to dashboard after login
- [ ] Password reset works
  - [ ] Reset email is sent
  - [ ] Reset link works
  - [ ] Can set new password
- [ ] Logout works
  - [ ] Clears session
  - [ ] Redirects to landing page

### Dashboard
- [ ] Dashboard loads after login
- [ ] Header shows "SmartCOI" branding
- [ ] User email displays in header
- [ ] Vendor list displays (empty or with sample data)
- [ ] Statistics cards show correct counts
- [ ] Search functionality works
- [ ] Filter buttons work (All, Expired, Non-Compliant, etc.)
- [ ] Sort functionality works
- [ ] Settings button opens settings modal

### AI PDF Upload
- [ ] Upload button opens modal
- [ ] Drag-and-drop works for PDFs
- [ ] File validation works (rejects non-PDFs, files >5MB)
- [ ] Upload progress indicator shows
- [ ] AI extraction processes PDF
- [ ] Extracted data displays correctly
- [ ] Compliance status calculated correctly
- [ ] New vendor appears in list
- [ ] PDF stored in Supabase storage

### Settings
- [ ] Settings modal opens
- [ ] Can update coverage requirements
- [ ] Changes save to database
- [ ] Settings persist after refresh
- [ ] Validation works on input fields

### Data Management
- [ ] Can edit vendor details
- [ ] Can delete vendors
- [ ] Changes save correctly
- [ ] Data persists after page refresh
- [ ] Export to CSV works

## 7. Performance & SEO

- [ ] Lighthouse score (run on deployed site):
  - [ ] Performance: >85
  - [ ] Accessibility: >90
  - [ ] Best Practices: >90
  - [ ] SEO: >90
- [ ] Page load time <3 seconds
- [ ] Images optimized
- [ ] Fonts load properly (Libre Baskerville, DM Sans)

## 8. Security

- [ ] HTTPS enabled (SSL certificate active)
- [ ] Security headers configured (X-Frame-Options, CSP, etc.)
- [ ] No API keys exposed in frontend code
- [ ] Environment variables properly hidden
- [ ] CORS configured correctly in Supabase
- [ ] RLS policies protect user data
- [ ] Authentication required for dashboard routes

## 9. Browser Testing

Test on:
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Edge (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

## 10. Error Handling

- [ ] 404 page works (invalid routes)
- [ ] Network error handling (offline mode)
- [ ] API error messages display correctly
- [ ] Form validation errors display
- [ ] Upload errors handled gracefully

## 11. Analytics & Monitoring (Optional but Recommended)

Consider adding:
- [ ] Google Analytics or Plausible
- [ ] Error tracking (Sentry, LogRocket, etc.)
- [ ] Uptime monitoring (UptimeRobot, etc.)
- [ ] User feedback tool (Hotjar, etc.)

## 12. Legal & Compliance (If applicable)

- [ ] Privacy Policy page (if collecting personal data)
- [ ] Terms of Service page
- [ ] Cookie consent (if using cookies)
- [ ] GDPR compliance (if serving EU users)
- [ ] Accessibility statement

## 13. Marketing Assets

- [ ] Logo finalized (choose from 4 concepts)
- [ ] Social media graphics created
- [ ] Email templates designed
- [ ] Product screenshots for marketing
- [ ] Demo video (optional)

## 14. Launch Day

- [ ] Announce on social media
- [ ] Email list (if any)
- [ ] Product Hunt launch (optional)
- [ ] Reddit/LinkedIn posts (optional)
- [ ] Update GitHub repo README
- [ ] Add link to portfolio/website

## 15. Post-Launch Monitoring

First 24 hours after launch:
- [ ] Monitor error logs
- [ ] Check performance metrics
- [ ] Review user signups
- [ ] Test critical flows again
- [ ] Respond to user feedback
- [ ] Fix any critical bugs immediately

## Support Resources

- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **Anthropic API Docs**: https://docs.anthropic.com

## Quick Commands

```bash
# Install dependencies
npm install

# Run locally
npm start

# Build for production
npm run build

# Deploy to Vercel (CLI)
vercel --prod

# Check for updates
npm outdated

# Update dependencies
npm update
```

---

**Ready to Launch?** 🚀

Once all critical items (sections 1-6) are checked, you're ready to go live!
