# Coming Soon Listings

A simple site for your team to post "Coming Soon" property listings with photos and highlights. No login required — anyone with the link can post. Listings are **automatically and permanently deleted** once their list date passes.

## What it does

- Public page shows all active coming-soon listings (soonest list date first), with photos, price, highlights, and who posted it.
- "+ Add Listing" opens a form: address, city/state, price, list date, highlights (one per line), agent name, and up to 8 photos.
- Every hour (and on server restart), any listing whose list date has passed is deleted along with its photos.

## Running it yourself first (optional)

If you have Node.js 18+ installed:

```
cd coming-soon-listings
npm install
npm start
```

Then open http://localhost:3000

## Deploying so your team can use it online

The easiest free option is **Render**. You'll need a GitHub account (free) and a Render account (free).

### 1. Put the code on GitHub

1. Go to github.com, sign in (or create a free account), and click **New repository**. Name it `coming-soon-listings`, keep it private if you like, and click **Create repository**.
2. On the new repo's page, click **uploading an existing file** and drag in the entire `coming-soon-listings` folder contents (or use GitHub Desktop if you prefer a drag-and-drop app). Commit the upload.

### 2. Create the Render service

1. Go to render.com and sign up (you can sign in with your GitHub account).
2. Click **New +** → **Web Service**, and connect the `coming-soon-listings` repo you just created.
3. Settings:
   - **Runtime**: Node
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: Free is fine to start
4. Before clicking Create, add a **Disk** (under Advanced) — this keeps uploaded photos and listings from disappearing when the service restarts:
   - **Name**: data
   - **Mount Path**: `/opt/render/project/src/uploads` — add a second disk (or a larger single one you split via subfolders) for `/opt/render/project/src/data` as well, since both need to persist. If Render only lets you add one disk on the free tier, mount it at `/opt/render/project/src` so both `uploads/` and `data/` live on it.
5. Click **Create Web Service**. Render will build and deploy — this takes a few minutes.
6. Once live, Render gives you a URL like `https://coming-soon-listings.onrender.com`. Share that link with your 12 agents — that's the site.

### Notes

- **Free tier sleeps**: Render's free web services spin down after inactivity and take ~30–60 seconds to wake back up on the next visit. If that's annoying, upgrade to Render's cheapest paid tier (~$7/mo) for an always-on instance.
- **No login**: anyone with the link can add a listing. If you later want to require a password, let me know and I can add simple shared-password protection.
- **Photo limits**: up to 8 photos per listing, 10MB each. Adjust in `server.js` (the `multer` limits) if you need more.
- **Backups**: listing data lives in `data/db.json` and photos in `uploads/` on the Render disk. Render disks are persistent, but it's still worth downloading a copy of `data/db.json` occasionally if the listings matter long-term.

## Customizing

- Colors/branding: edit `public/style.css` (the `:root` variables at the top control the green theme).
- Form fields: edit `public/index.html` (the form) and `server.js` (the `/api/listings` POST handler) together if you add new fields.
