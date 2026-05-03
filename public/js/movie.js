/* ─────────────────────────────────────────────────────────
   CineDB — movie.js
   Handles: reading ?id= from URL, fetching movie detail,
            rendering the full detail view.
───────────────────────────────────────────────────────── */

/* ── DOM refs ───────────────────────────────────────────── */
const detailLoading = document.getElementById('detailLoading');
const detailError   = document.getElementById('detailError');
const detailContent = document.getElementById('detailContent');

/* ── Shared search bar (reuse app.js-style behavior) ────── */
const searchInput = document.getElementById('searchInput');
const searchBtn   = document.getElementById('searchBtn');
const suggestions = document.getElementById('suggestions');

/* ── API ────────────────────────────────────────────────── */
async function fetchMovie(id) {
  const res = await fetch(`/api/movie?id=${encodeURIComponent(id)}`);
  if (!res.ok) throw new Error('Request failed');
  return res.json();
}

async function fetchSuggestions(q) {
  const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
  if (!res.ok) return [];
  const data = await res.json();
  return data.Response === 'True' ? data.Search : [];
}

/* ── Helpers ────────────────────────────────────────────── */
function sanitize(str) {
  return str && str !== 'N/A' ? str : null;
}

function ratingSource(source) {
  const map = {
    'Internet Movie Database': 'IMDb',
    'Rotten Tomatoes':         'Rotten Tomatoes',
    'Metacritic':              'Metacritic',
  };
  return map[source] || source;
}

/* ── Render detail ──────────────────────────────────────── */
function renderDetail(m) {
  document.title = `${m.Title} (${m.Year}) — CineDB`;

  const hasPoster   = sanitize(m.Poster);
  const hasPlot     = sanitize(m.Plot);
  const hasDirector = sanitize(m.Director);
  const hasActors   = sanitize(m.Actors);
  const hasWriter   = sanitize(m.Writer);
  const hasGenre    = sanitize(m.Genre);
  const hasRatings  = m.Ratings && m.Ratings.length > 0;
  const isSeries    = m.Type === 'series';

  // Meta pills
  const metaPills = [
    m.Year,
    m.Runtime !== 'N/A' ? m.Runtime : null,
    m.Rated !== 'N/A' ? m.Rated : null,
    isSeries && m.totalSeasons ? `${m.totalSeasons} seasons` : null,
    m.Country !== 'N/A' ? m.Country?.split(',')[0].trim() : null,
  ]
    .filter(Boolean)
    .map(p => `<span class="meta-pill">${p}</span>`)
    .join('');

  // Ratings
  const ratingsHtml = hasRatings
    ? m.Ratings.map(r => `
        <div class="score-row">
          <span class="score-source">${ratingSource(r.Source)}</span>
          <span class="score-value">${r.Value}</span>
        </div>
      `).join('')
    : '';

  // Genres
  const genreHtml = hasGenre
    ? hasGenre.split(',').map(g => `<span class="genre-tag">${g.trim()}</span>`).join('')
    : '';

  detailContent.innerHTML = `
    <a class="detail-back" href="/">← Back to catalog</a>

    <div class="detail-layout">

      <!-- Poster + scores column -->
      <div class="detail-poster-wrap">
        ${hasPoster
          ? `<img class="detail-poster" src="${hasPoster}" alt="${m.Title}" />`
          : `<div class="detail-no-poster">🎬</div>`}
        ${ratingsHtml ? `<div class="detail-scores">${ratingsHtml}</div>` : ''}
      </div>

      <!-- Info column -->
      <div class="detail-info">
        <span class="detail-type-badge">${m.Type}</span>
        <h1 class="detail-title">${m.Title}</h1>
        ${m.Awards && m.Awards !== 'N/A' ? `<p class="detail-tagline">${m.Awards}</p>` : ''}

        <div class="detail-meta">${metaPills}</div>

        ${hasGenre ? `
          <p class="section-label">Genres</p>
          <div class="genre-tags">${genreHtml}</div>
          <hr class="detail-divider" />
        ` : ''}

        ${hasPlot ? `
          <p class="section-label">Plot</p>
          <p class="detail-plot">${hasPlot}</p>
          <hr class="detail-divider" />
        ` : ''}

        <div class="detail-credits">
          ${hasDirector ? `
            <div class="credit-group">
              <p class="section-label">Director</p>
              <p class="credit-value">${hasDirector}</p>
            </div>
          ` : ''}
          ${hasWriter ? `
            <div class="credit-group">
              <p class="section-label">Writer</p>
              <p class="credit-value">${sanitize(m.Writer.split(',')[0]) || m.Writer}</p>
            </div>
          ` : ''}
          ${hasActors ? `
            <div class="credit-group" style="grid-column: 1 / -1">
              <p class="section-label">Cast</p>
              <p class="credit-value">${hasActors}</p>
            </div>
          ` : ''}
          ${m.Language && m.Language !== 'N/A' ? `
            <div class="credit-group">
              <p class="section-label">Language</p>
              <p class="credit-value">${m.Language.split(',')[0].trim()}</p>
            </div>
          ` : ''}
          ${m.BoxOffice && m.BoxOffice !== 'N/A' ? `
            <div class="credit-group">
              <p class="section-label">Box Office</p>
              <p class="credit-value">${m.BoxOffice}</p>
            </div>
          ` : ''}
        </div>

      </div>
    </div>
  `;

  detailContent.hidden = false;
}

/* ── Header search (autocomplete only on detail page) ────── */
let debounceTimer = null;
let currentFocus  = -1;

function renderSuggestions(items) {
  suggestions.innerHTML = '';
  if (!items.length) { suggestions.hidden = true; return; }

  items.slice(0, 6).forEach(item => {
    const hasPoster = item.Poster && item.Poster !== 'N/A';
    const li = document.createElement('li');
    li.className = 'suggestion-item';
    li.innerHTML = `
      <img
        class="suggestion-poster"
        src="${hasPoster ? item.Poster : 'data:image/svg+xml,<svg xmlns=\'http://www.w3.org/2000/svg\'><rect width=\'36\' height=\'52\' fill=\'%23181818\'/></svg>'}"
        alt=""
      />
      <div class="suggestion-info">
        <p class="suggestion-title">${item.Title}</p>
        <p class="suggestion-meta">${item.Year} &nbsp;<span>${item.Type}</span></p>
      </div>
    `;
    li.addEventListener('click', () => {
      window.location.href = `/movie?id=${item.imdbID}`;
    });
    suggestions.appendChild(li);
  });

  suggestions.hidden = false;
  currentFocus = -1;
}

searchInput.addEventListener('input', () => {
  clearTimeout(debounceTimer);
  const q = searchInput.value.trim();
  if (q.length < 2) { suggestions.hidden = true; return; }
  debounceTimer = setTimeout(async () => {
    const items = await fetchSuggestions(q);
    renderSuggestions(items);
  }, 280);
});

searchInput.addEventListener('keydown', (e) => {
  const items = suggestions.querySelectorAll('.suggestion-item');
  if (e.key === 'Enter' && !items.length) {
    window.location.href = `/?q=${encodeURIComponent(searchInput.value.trim())}`;
    return;
  }
  if (e.key === 'ArrowDown') { e.preventDefault(); currentFocus = Math.min(currentFocus + 1, items.length - 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); currentFocus = Math.max(currentFocus - 1, -1); }
  else if (e.key === 'Enter' && currentFocus >= 0) { items[currentFocus].click(); return; }
  else if (e.key === 'Escape') { suggestions.hidden = true; return; }
  items.forEach((el, i) => el.classList.toggle('active', i === currentFocus));
});

searchBtn.addEventListener('click', () => {
  const q = searchInput.value.trim();
  if (q) window.location.href = `/?q=${encodeURIComponent(q)}`;
});

document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrapper')) suggestions.hidden = true;
});

/* ── Init ───────────────────────────────────────────────── */
(async () => {
  const params = new URLSearchParams(window.location.search);
  const id     = params.get('id');

  if (!id) {
    detailLoading.style.display  = 'none';
    detailError.hidden = false;
    return;
  }

  try {
    const movie = await fetchMovie(id);

    detailLoading.style.display = 'none';

    if (movie.Response === 'False') {
      detailError.hidden = false;
      return;
    }

    renderDetail(movie);

  } catch (err) {
    console.error(err);
    detailLoading.style.display = 'none';
    detailError.hidden = false;
  }
})();
