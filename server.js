// Coming Soon Listings - simple team site
// - Any teammate with the link can add a listing (no login, per request)
// - Listings automatically and permanently delete once their "list date" passes
// - Photos are stored on disk under /uploads

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// Everything that needs to survive a restart/redeploy lives under one folder
// (STORAGE_DIR), so a single Render persistent disk mounted at that path covers
// both the listings data and the uploaded photos. Locally this just becomes a
// "storage" folder next to server.js.
const STORAGE_DIR = process.env.STORAGE_DIR || path.join(__dirname, 'storage');
const DATA_DIR = path.join(STORAGE_DIR, 'data');
const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Make sure our storage folders/files exist
for (const dir of [DATA_DIR, UPLOADS_DIR]) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify({ listings: [] }, null, 2));
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(db) {
  fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

// Today as YYYY-MM-DD in server-local time, used to compare against list dates
function todayStr() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Permanently remove any listing whose list date has passed, plus its photo files
function cleanupExpired() {
  const db = readDB();
  const today = todayStr();
  const keep = [];
  const expired = [];
  for (const listing of db.listings) {
    if (listing.listDate && listing.listDate < today) {
      expired.push(listing);
    } else {
      keep.push(listing);
    }
  }
  if (expired.length) {
    for (const listing of expired) {
      for (const filename of listing.photos || []) {
        const p = path.join(UPLOADS_DIR, filename);
        fs.unlink(p, () => {});
      }
    }
    db.listings = keep;
    writeDB(db);
    console.log(`Cleaned up ${expired.length} expired listing(s) at ${new Date().toISOString()}`);
  }
  return expired.length;
}

// Run cleanup on boot, then once an hour
cleanupExpired();
setInterval(cleanupExpired, 60 * 60 * 1000);

const app = express();

app.use(express.json());
app.use('/uploads', express.static(UPLOADS_DIR));
app.use(express.static(path.join(__dirname, 'public')));

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOADS_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

function imageFileFilter(req, file, cb) {
  if (/^image\//.test(file.mimetype)) cb(null, true);
  else cb(new Error('Only image files are allowed'));
}

const upload = multer({
  storage,
  fileFilter: imageFileFilter,
  limits: { fileSize: 10 * 1024 * 1024, files: 8 }, // 10MB each, up to 8 photos
});

// List all active (non-expired) listings, soonest list date first
app.get('/api/listings', (req, res) => {
  cleanupExpired();
  const db = readDB();
  const sorted = [...db.listings].sort((a, b) => (a.listDate || '').localeCompare(b.listDate || ''));
  res.json(sorted);
});

// Add a new listing
app.post('/api/listings', upload.array('photos', 8), (req, res) => {
  try {
    const { address, city, state, price, listDate, highlights, agentName } = req.body;

    if (!address || !listDate) {
      return res.status(400).json({ error: 'Address and list date are required.' });
    }

    const db = readDB();
    const listing = {
      id: crypto.randomUUID(),
      address: String(address).trim(),
      city: (city || '').trim(),
      state: (state || '').trim(),
      price: (price || '').trim(),
      listDate: String(listDate).trim(), // YYYY-MM-DD - the date it goes live / stops being "coming soon"
      highlights: String(highlights || '')
        .split('\n')
        .map((h) => h.trim())
        .filter(Boolean),
      agentName: (agentName || '').trim(),
      photos: (req.files || []).map((f) => f.filename),
      createdAt: new Date().toISOString(),
    };

    db.listings.push(listing);
    writeDB(db);
    res.status(201).json(listing);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Something went wrong saving the listing.' });
  }
});

// Manually remove a listing early (e.g. it went pending/sold before the list date)
app.delete('/api/listings/:id', (req, res) => {
  const db = readDB();
  const listing = db.listings.find((l) => l.id === req.params.id);
  if (!listing) return res.status(404).json({ error: 'Not found' });

  for (const filename of listing.photos || []) {
    fs.unlink(path.join(UPLOADS_DIR, filename), () => {});
  }
  db.listings = db.listings.filter((l) => l.id !== req.params.id);
  writeDB(db);
  res.status(204).end();
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Coming Soon Listings running on port ${PORT}`);
});
