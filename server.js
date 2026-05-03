require('dotenv').config();
const express = require('express');
const path    = require('path');

const app      = express();
const PORT     = process.env.PORT || 3000;
const API_KEY  = process.env.API_KEY;
const OMDB_URL = 'https://www.omdbapi.com/';

/* ── Static files ─────────────────────────────────────── */
app.use(express.static(path.join(__dirname, 'public')));

/* ── OMDB helper ──────────────────────────────────────── */
async function omdbFetch(params) {
  const url = new URL(OMDB_URL);
  url.searchParams.set('apikey', API_KEY);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error(`OMDB responded with ${res.status}`);
  return res.json();
}

/* ── Routes ───────────────────────────────────────────── */

// Search: /api/search?q=batman&type=movie&page=1
app.get('/api/search', async (req, res) => {
  const { q, type, page = '1' } = req.query;
  if (!q) return res.status(400).json({ error: 'Query parameter "q" is required.' });

  try {
    const data = await omdbFetch({ s: q, type, page });
    res.json(data);
  } catch (err) {
    console.error('[/api/search]', err.message);
    res.status(500).json({ error: 'Failed to reach OMDB API.' });
  }
});

// Detail: /api/movie?id=tt0468569
app.get('/api/movie', async (req, res) => {
  const { id } = req.query;
  if (!id) return res.status(400).json({ error: 'Query parameter "id" is required.' });

  try {
    const data = await omdbFetch({ i: id, plot: 'full' });
    res.json(data);
  } catch (err) {
    console.error('[/api/movie]', err.message);
    res.status(500).json({ error: 'Failed to reach OMDB API.' });
  }
});

// Serve movie detail page for any /movie route (client-side reads ?id= param)
app.get('/movie', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'movie.html'));
});

/* ── Start ────────────────────────────────────────────── */
app.listen(PORT, () => {
  console.log(`🎬  CineDB is running → http://localhost:${PORT}`);
});
