# 🔧 PlumbQuote

**Fast, accurate job estimates for plumbers — in under 2 minutes.**

---

## What It Does

- Google sign-in (no passwords to manage)
- 4 preloaded job templates (Service Call, Toilet Install, Bathroom Rough-In, Drain Cleaning)
- Live quote calculator: change any field → price updates instantly
- Profit protection warnings (low margin, low hourly rate)
- Save custom templates to reuse
- Export clean PDF quotes to send to customers

---

## Project Structure

```
plumb-quote/
├── public/
│   └── index.html
├── src/
│   ├── data/
│   │   └── templates.js        # 4 default job templates
│   ├── hooks/
│   │   ├── useAuth.js          # Firebase Google auth
│   │   └── useTemplates.js     # Firestore CRUD for templates
│   ├── pages/
│   │   ├── LoginPage.jsx       # Google sign-in screen
│   │   ├── DashboardPage.jsx   # Template list + New Quote CTA
│   │   └── QuoteBuilderPage.jsx # Live quote calculator
│   ├── utils/
│   │   ├── calculate.js        # Core pricing formulas
│   │   └── exportPdf.js        # PDF generation
│   ├── firebase.js             # Firebase init
│   ├── App.js                  # Root: auth + page routing
│   └── index.js                # React entry point
├── firestore.rules             # Security rules
├── firebase.json               # Firebase hosting config
├── tailwind.config.js
├── .env.example
└── package.json
```

---

## Setup: Step by Step

### Step 1 — Clone & Install

```bash
git clone <your-repo-url>
cd plumb-quote
npm install
```

### Step 2 — Create a Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Click **"Add project"** → name it `plumb-quote`
3. Disable Google Analytics (not needed) → **Create project**

### Step 3 — Enable Google Auth

1. In Firebase Console → **Authentication** → **Get started**
2. Click **Google** → Enable → Save
3. Add your domain to **Authorized domains** (add `localhost` for dev)

### Step 4 — Create Firestore Database

1. Firebase Console → **Firestore Database** → **Create database**
2. Choose **"Start in production mode"**
3. Select a region close to your users (e.g. `us-central`)

### Step 5 — Deploy Firestore Security Rules

```bash
npm install -g firebase-tools
firebase login
firebase init firestore   # select your project, accept defaults
firebase deploy --only firestore:rules
```

### Step 6 — Get Your Firebase Config

1. Firebase Console → **Project Settings** (gear icon) → **Your apps**
2. Click **"</>  Web"** → Register app → copy the config values

### Step 7 — Set Up Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in your values:

```
REACT_APP_FIREBASE_API_KEY=AIzaSy...
REACT_APP_FIREBASE_AUTH_DOMAIN=plumb-quote.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=plumb-quote
REACT_APP_FIREBASE_STORAGE_BUCKET=plumb-quote.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=123456789
REACT_APP_FIREBASE_APP_ID=1:123456789:web:abc123
```

### Step 8 — Run Locally

```bash
npm start
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deploy to Vercel (Recommended)

Vercel is the fastest way to get this live. Free tier is plenty.

### Option A: Vercel CLI

```bash
npm install -g vercel
vercel
```

Follow the prompts. When asked about environment variables, add each
`REACT_APP_*` variable from your `.env.local`.

### Option B: Vercel Dashboard

1. Push your project to GitHub
2. Go to [https://vercel.com](https://vercel.com) → **New Project** → import your repo
3. Framework: **Create React App** (auto-detected)
4. Add all `REACT_APP_*` environment variables under **Settings → Environment Variables**
5. Click **Deploy**

> After deploy, copy your Vercel URL (e.g. `https://plumb-quote.vercel.app`)
> and add it to Firebase Console → Authentication → Authorized domains.

---

## Deploy to Firebase Hosting (Alternative)

```bash
npm run build
firebase init hosting   # public dir: build, SPA: yes
firebase deploy
```

---

## Pricing Formula Reference

```
Labor Total    = laborHours × hourlyRate
Materials Total = materialCost × materialMarkup
Subtotal       = Labor Total + Materials Total
Final Price    = Subtotal × profitMargin
```

**Profit protection warnings:**
- `profitMargin < 1.15` → "You may be underpricing this job"
- `hourlyRate < 75` → "Hourly rate is below market minimum"

---

## Customizing Default Templates

Edit `src/data/templates.js` to change the 4 default templates.
These are seeded into Firestore the first time a new user signs in.

```js
{
  id: "service-call",
  name: "Service Call",
  icon: "🔧",
  laborHours: 1.5,
  hourlyRate: 125,
  materialCost: 45,
  materialMarkup: 1.4,
  profitMargin: 1.2,
}
```

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React 18 |
| Styling | Tailwind CSS |
| Auth | Firebase Auth (Google) |
| Database | Cloud Firestore |
| PDF | jsPDF + jspdf-autotable |
| Deploy | Vercel or Firebase Hosting |

---

## What's Intentionally NOT Included

- No CRM or customer management
- No scheduling
- No analytics or dashboards
- No payment processing
- No complex routing library

This keeps the app fast to load, easy to maintain, and focused on
the one thing plumbers need: **get a price, get paid.**
