# MegaDraw India — Lucky Draw Contest

A web application where the **first 10 people** to register with their phone number, name, and Aadhaar card **win cash prizes** up to ₹50,000.

## Features

- **Landing Page** — Premium dark-themed UI with live counters, prize grid, winners board
- **Registration** — Form with validation (phone, name, Aadhaar), auto-winner detection
- **Admin Panel** — Login, dashboard with stats, searchable registrations table
- **Winner System** — First 10 registrants automatically win tiered cash prizes
- **Confetti Animation** — Celebratory confetti and modal for winners

## Tech Stack

- **Backend**: Node.js + Express
- **Database**: SQLite (via better-sqlite3)
- **Frontend**: HTML + Vanilla CSS + JavaScript
- **Auth**: Express sessions (admin only)

## Quick Start

```bash
git clone <your-repo-url>
cd lottery-site
cp .env.example .env    # Edit with your credentials
npm install
node server.js
```

Open http://localhost:3000 in your browser.

**Admin Panel**: http://localhost:3000/admin  
Default credentials: `admin` / `admin123`

## Prize Tiers

| Position | Prize |
|----------|-------|
| 1st | ₹50,000 |
| 2nd | ₹25,000 |
| 3rd | ₹15,000 |
| 4th–5th | ₹10,000 |
| 6th–8th | ₹5,000 |
| 9th | ₹3,000 |
| 10th | ₹2,000 |

**Total Prize Pool: ₹1,30,000**

## Deployment

See [DEPLOYMENT.md](./DEPLOYMENT.md) for AWS EC2 deployment instructions.

## License

MIT
