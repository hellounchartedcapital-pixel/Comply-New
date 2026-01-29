// Vercel Cron Job for Auto Follow-up
// Runs daily at 9 AM UTC to send reminder emails to vendors

export default async function handler(req, res) {
  // Verify this request is from Vercel Cron (security check)
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.log('Unauthorized cron request');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Call the Supabase auto-follow-up edge function
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.REACT_APP_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Missing Supabase configuration');
    }

    const response = await fetch(
      `${supabaseUrl}/functions/v1/auto-follow-up`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({}),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error('Auto follow-up failed:', data);
      return res.status(response.status).json(data);
    }

    console.log('Auto follow-up completed:', data);
    return res.status(200).json({
      success: true,
      message: 'Auto follow-up completed',
      ...data,
    });
  } catch (error) {
    console.error('Cron job error:', error);
    return res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
