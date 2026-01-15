# Email Notifications Setup Guide

## Overview
SmartCOI includes an automated email notification system that alerts users about:
- Policies expiring soon (customizable threshold)
- Expired policies
- Non-compliant coverage

## Setup Steps

### 1. Database Migration
Run the SQL migration to create the `notification_settings` table:

```bash
# In Supabase Dashboard: SQL Editor
# Run the contents of: supabase-migrations/02_notification_settings.sql
```

Or run directly in your Supabase SQL editor:
```sql
-- Copy and paste the contents of supabase-migrations/02_notification_settings.sql
```

### 2. Deploy Supabase Edge Function

#### Install Supabase CLI (if not already installed)
```bash
npm install -g supabase
```

#### Login to Supabase
```bash
supabase login
```

#### Link your project
```bash
supabase link --project-ref your-project-ref
```

#### Deploy the function
```bash
supabase functions deploy send-notifications
```

### 3. Set Environment Variables

In your Supabase Dashboard:
1. Go to **Project Settings** → **Edge Functions**
2. Add the following secrets:

```bash
# Option 1: Using Resend (recommended)
RESEND_API_KEY=re_xxxxxxxxxxxxx

# Option 2: Using SendGrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx

# Option 3: Using Mailgun
MAILGUN_API_KEY=your-mailgun-api-key
MAILGUN_DOMAIN=mg.yourdomain.com
```

#### Getting API Keys:

**Resend (Recommended):**
1. Sign up at https://resend.com
2. Create an API key
3. Verify your domain (or use their test domain)
4. Free tier: 100 emails/day, 3,000 emails/month

**SendGrid:**
1. Sign up at https://sendgrid.com
2. Create an API key with "Mail Send" permissions
3. Verify sender identity
4. Free tier: 100 emails/day

**Mailgun:**
1. Sign up at https://mailgun.com
2. Get your API key from dashboard
3. Add and verify your domain
4. Free tier: 5,000 emails/month

### 4. Set Up Cron Job

Create a cron job to run the notification function periodically:

#### Using Supabase Cron (Recommended)

In Supabase SQL Editor, create a cron job:

```sql
-- Install pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule daily notifications at 9 AM UTC
SELECT cron.schedule(
  'daily-notifications',
  '0 9 * * *',  -- Every day at 9:00 AM UTC
  $$
  SELECT
    net.http_post(
      url:='YOUR_SUPABASE_URL/functions/v1/send-notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_ANON_KEY"}'::jsonb,
      body:='{}'::jsonb
    ) as request_id;
  $$
);
```

Replace:
- `YOUR_SUPABASE_URL` with your actual Supabase URL
- `YOUR_ANON_KEY` with your Supabase anon key

#### Alternative: External Cron Services

You can also use external services like:

**Cron-job.org:**
1. Create account at https://cron-job.org
2. Create new cron job
3. Set URL: `YOUR_SUPABASE_URL/functions/v1/send-notifications`
4. Add header: `Authorization: Bearer YOUR_ANON_KEY`
5. Schedule: Daily at preferred time

**GitHub Actions:**
```yaml
name: Send SmartCOI Notifications
on:
  schedule:
    - cron: '0 9 * * *'  # Daily at 9 AM UTC
jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger notifications
        run: |
          curl -X POST YOUR_SUPABASE_URL/functions/v1/send-notifications \
            -H "Authorization: Bearer ${{ secrets.SUPABASE_ANON_KEY }}" \
            -H "Content-Type: application/json"
```

### 5. Test the System

#### Test via Dashboard:
1. Log into SmartCOI
2. Click **Notifications** button in header
3. Enable email notifications
4. Set your email address
5. Configure notification preferences
6. Save settings

#### Manual Test:
```bash
curl -X POST YOUR_SUPABASE_URL/functions/v1/send-notifications \
  -H "Authorization: Bearer YOUR_ANON_KEY" \
  -H "Content-Type: application/json"
```

#### Check Logs:
```bash
supabase functions logs send-notifications
```

## Notification Frequency Options

### Immediate
- Sends email as soon as an issue is detected
- Best for: Critical compliance requirements
- Cron schedule: Every hour `0 * * * *`

### Daily Digest
- Sends one email per day with all issues
- Best for: Most users
- Cron schedule: Daily at 9 AM `0 9 * * *`

### Weekly Summary
- Sends one email per week
- Best for: Less critical monitoring
- Cron schedule: Monday at 9 AM `0 9 * * 1`

## Customization

### Email Template
Edit the `generateEmailBody()` function in `/supabase/functions/send-notifications/index.ts` to customize:
- Email styling
- Content layout
- Branding
- Call-to-action buttons

### Notification Logic
Modify the notification criteria in `/supabase/functions/send-notifications/index.ts`:
- Change days threshold calculation
- Add custom vendor filtering
- Include additional vendor data

## Troubleshooting

### Emails not sending?
1. Check Supabase function logs
2. Verify API key is set correctly
3. Confirm email service account is active
4. Check spam folder
5. Verify sender domain is verified

### Wrong notifications?
1. Check user's notification settings in database
2. Verify vendor expiration dates are correct
3. Review notification frequency setting

### Function not running?
1. Verify cron job is active: `SELECT * FROM cron.job;`
2. Check cron job logs
3. Ensure function is deployed: `supabase functions list`

## Security Notes

- Never commit API keys to version control
- Use environment variables for all secrets
- Restrict Edge Function permissions
- Enable RLS on notification_settings table
- Regularly review notification logs

## Cost Estimates

### Email Services (per month):
- **Resend Free**: $0 (3,000 emails)
- **SendGrid Free**: $0 (100 emails/day = ~3,000/month)
- **Mailgun Free**: $0 (5,000 emails)

### Supabase:
- **Edge Functions**: Free tier includes 500K requests
- **Database**: Free tier includes unlimited API requests
- **Cron Jobs**: Included in all plans

## Support

For issues or questions:
1. Check Supabase function logs
2. Review notification_settings table data
3. Test email service API key directly
4. Contact support@smartcoi.io
