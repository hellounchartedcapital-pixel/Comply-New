# SmartCOI - AI-Powered Certificate of Insurance Tracking

> Stop chasing COIs. AI-powered tracking that saves property managers 10+ hours per week.

![SmartCOI](https://smartcoi.io)

## Overview

SmartCOI is a SaaS application that automates Certificate of Insurance (COI) compliance tracking for property managers. Upload a COI PDF, and our AI instantly extracts all the data, validates compliance, and tracks expiration dates.

## Features

- **AI PDF Extraction** - Upload COI PDFs and extract data in 5 seconds using Claude AI
- **Instant Compliance Checking** - Automatic validation against your requirements
- **Smart Alerts** - Email notifications 30 days before policy expiration
- **Dashboard Analytics** - See compliance status at a glance (red/orange/yellow/green)
- **Custom Requirements** - Set your own coverage minimums
- **Export Reports** - Download to CSV for audits and reporting
- **Secure Authentication** - Email/password auth with Supabase

## Tech Stack

- **Frontend**: React 18, Tailwind CSS
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **AI**: Anthropic Claude API for PDF extraction
- **Deployment**: Vercel
- **Domain**: smartcoi.io

## Getting Started

### Prerequisites

- Node.js 16+ and npm
- Supabase account
- Anthropic API key

### Installation

1. Clone the repository
```bash
git clone https://github.com/hellounchartedcapital-pixel/Comply-New.git
cd Comply-New
```

2. Install dependencies
```bash
npm install
```

3. Set up environment variables

Copy `env.example` to `.env`:
```bash
cp env.example .env
```

Add your credentials:
```env
REACT_APP_SUPABASE_URL=your-supabase-project-url
REACT_APP_SUPABASE_ANON_KEY=your-supabase-anon-key
REACT_APP_ANTHROPIC_API_KEY=your-anthropic-api-key
```

4. Set up Supabase database

Run the SQL schema from `LAUNCH_CHECKLIST.md` section 3 in your Supabase SQL editor.

5. Start development server
```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

## Deployment

### Deploy to Vercel

1. Push your code to GitHub
2. Import project in Vercel dashboard
3. Add environment variables in Vercel settings
4. Deploy!

Detailed deployment instructions in `DOMAIN_SETUP.md`.

## Project Structure

```
Comply-New/
├── public/
│   ├── index.html
│   ├── favicon.svg
│   └── logo-concept-*.svg      # Logo variations
├── src/
│   ├── App.jsx                 # Main router
│   ├── LandingPage.jsx         # Marketing homepage
│   ├── Login.jsx               # Authentication
│   ├── Signup.jsx              # Registration
│   ├── ComplyApp.jsx           # Main dashboard
│   ├── UploadModal.jsx         # PDF upload
│   ├── Settings.jsx            # User settings
│   ├── extractCOI.js           # AI extraction logic
│   ├── useVendors.js           # Database CRUD
│   ├── AuthContext.js          # Auth state
│   └── supabaseClient.js       # Supabase config
├── package.json
├── vercel.json                 # Deployment config
├── LOGO_CONCEPTS.md            # Logo design docs
├── DOMAIN_SETUP.md             # Domain connection guide
├── LAUNCH_CHECKLIST.md         # Pre-launch checklist
└── README.md
```

## Key Files

- **extractCOI.js** - AI extraction using Claude API to parse COI PDFs
- **useVendors.js** - React hook for vendor CRUD operations with Supabase
- **ComplyApp.jsx** - Main dashboard with vendor list, search, filters, and compliance indicators
- **LandingPage.jsx** - Professional marketing landing page

## Environment Variables

| Variable | Description |
|----------|-------------|
| `REACT_APP_SUPABASE_URL` | Your Supabase project URL |
| `REACT_APP_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `REACT_APP_ANTHROPIC_API_KEY` | Anthropic API key for Claude |

## Available Scripts

- `npm start` - Run development server
- `npm run build` - Build for production
- `npm test` - Run tests (if configured)
- `npm run eject` - Eject from Create React App (not recommended)

## Logo Concepts

Four logo variations are available in `/public/`:
1. Shield + Checkmark (trust/security theme)
2. Document + AI Sparkles (smart processing theme)
3. Modern Minimal Badge (contemporary SaaS theme)
4. "SC" Monogram (bold brand identity)

See `LOGO_CONCEPTS.md` for details.

## Documentation

- [Logo Concepts](./LOGO_CONCEPTS.md) - Logo design variations
- [Domain Setup](./DOMAIN_SETUP.md) - Connect smartcoi.io to Vercel
- [Launch Checklist](./LAUNCH_CHECKLIST.md) - Pre-launch verification

## Features Roadmap

- [ ] Email notifications for expiring policies
- [ ] Multi-tenant support for property management companies
- [ ] Mobile app (React Native)
- [ ] Bulk PDF upload
- [ ] Advanced reporting and analytics
- [ ] Integration with property management software
- [ ] Automated vendor email reminders

## Support

For issues or questions:
- GitHub Issues: https://github.com/hellounchartedcapital-pixel/Comply-New/issues

## License

Proprietary - All rights reserved

## Author

Built with Claude Code 🤖

---

**Ready to launch?** Follow the checklist in `LAUNCH_CHECKLIST.md` 🚀
