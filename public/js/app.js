/* ─────────────────────────────────────────────────────────
   CineDB — app.js
   Handles: catalog grid, autocomplete search, filters,
            pagination, and navigation to detail pages.
───────────────────────────────────────────────────────── */

/* ── DOM refs ───────────────────────────────────────────── */
const searchInput  = document.getElementById('searchInput');
const searchBtn    = document.getElementById('searchBtn');
const suggestions  = document.getElementById('suggestions');
const grid         = document.getElementById('grid');
const skeletonGrid = document.getElementById('skeletonGrid');
const emptyState   = document.getElementById('emptyState');
const pagination   = document.getElementById('pagination');
const prevBtn      = document.getElementById('prevBtn');
const nextBtn      = document.getElementById('nextBtn');
const pageInfo     = document.getElementById('pageInfo');
const catalogHeading = document.getElementById('catalogHeading');
const filterBtns   = document.querySelectorAll('.filter-btn');

/* ── State ──────────────────────────────────────────────── */
const state = {
  query:       '',
  type:        '',
  page:        1,
  totalPages:  1,
  loading:     false,
};

/* ── Default searches shown on first load ───────────────── */
const DEFAULT_QUERIES = ['avengers', 'batman', 'breaking bad', 'inception'];

/* ── API helpers ────────────────────────────────────────── */
async function searchMovies(q, type = '', page = 1) {
  const params = new URLSearchParams({ q, page });
  if (type) params.set('type', type);
  const res = await fetch(`/api/search?${params}`);
  if (!res.ok) throw new Error('Search failed');
  return res.json();
}

/* ── Rendering ──────────────────────────────────────────── */
function renderCard(item) {
  const hasPoster = item.Poster && item.Poster !== 'N/A';
  const isSeries  = item.Type === 'series';

  const card = document.createElement('a');
  card.className = 'card';
  card.href      = `/movie?id=${item.imdbID}`;
  card.innerHTML = `
    <div class="card-poster-wrap">
      ${hasPoster
        ? `<img class="card-poster" src="${item.Poster}" alt="${item.Title}" loading="lazy" />`
        : `<div class="card-no-poster">🎬</div>`}
      <span class="card-type-badge ${isSeries ? 'series' : ''}">${item.Type}</span>
    </div>
    <div class="card-body">
      <p class="card-title">${item.Title}</p>
      <p class="card-year">${item.Year}</p>
    </div>
  `;
  return card;
}

function renderGrid(items) {
  grid.innerHTML = '';
  items.forEach(item => grid.appendChild(renderCard(item)));
}

function setLoading(isLoading) {
  state.loading = isLoading;
  skeletonGrid.classList.toggle('loading', isLoading);
  grid.classList.toggle('loading', isLoading);
}

function updatePagination() {
  const show = state.totalPages > 1;
  pagination.hidden = !show;
  if (!show) return;

  prevBtn.disabled = state.page <= 1;
  nextBtn.disabled = state.page >= state.totalPages;
  pageInfo.textContent = `${state.page} / ${state.totalPages}`;
}

/* ── Load catalog ───────────────────────────────────────── */
async function loadCatalog() {
  if (state.loading) return;

  setLoading(true);
  emptyState.hidden = true;
  pagination.hidden = true;

  try {
    let query = state.query;

    // On first load with no query, pick a default
    if (!query) {
      query = DEFAULT_QUERIES[Math.floor(Math.random() * DEFAULT_QUERIES.length)];
      catalogHeading.textContent = 'Trending Now';
    } else {
      catalogHeading.textContent = `Results for "${state.query}"`;
    }

    const data = await searchMovies(query, state.type, state.page);

    setLoading(false);

    if (data.Response === 'False' || !data.Search?.length) {
      renderGrid([]);
      emptyState.hidden = false;
      return;
    }

    renderGrid(data.Search);
    state.totalPages = Math.ceil(parseInt(data.totalResults, 10) / 10);
    updatePagination();

  } catch (err) {
    setLoading(false);
    console.error(err);
    emptyState.hidden = false;
  }
}

/* ── Autocomplete ───────────────────────────────────────── */
let debounceTimer = null;
let currentFocus  = -1;

function renderSuggestions(items) {
  suggestions.innerHTML = '';
  if (!items.length) { suggestions.hidden = true; return; }

  items.slice(0, 6).forEach((item, i) => {
    const hasPoster = item.Poster && item.Poster !== 'N/A';
    const li = document.createElement('li');
    li.className = 'suggestion-item';
    li.dataset.id = item.imdbID;
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

function closeSuggestions() {
  suggestions.hidden = true;
  currentFocus = -1;
}

searchInput.addEventListener('input', () => {
  const q = searchInput.value.trim();
  clearTimeout(debounceTimer);

  if (q.length < 2) { closeSuggestions(); return; }

  debounceTimer = setTimeout(async () => {
    try {
      const data = await searchMovies(q, '', 1);
      renderSuggestions(data.Response === 'True' ? data.Search : []);
    } catch {
      closeSuggestions();
    }
  }, 280);
});

// Keyboard navigation inside suggestions
searchInput.addEventListener('keydown', (e) => {
  const items = suggestions.querySelectorAll('.suggestion-item');
  if (!items.length) {
    if (e.key === 'Enter') triggerSearch();
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    currentFocus = Math.min(currentFocus + 1, items.length - 1);
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    currentFocus = Math.max(currentFocus - 1, -1);
  } else if (e.key === 'Enter') {
    if (currentFocus >= 0) {
      items[currentFocus].click();
    } else {
      closeSuggestions();
      triggerSearch();
    }
    return;
  } else if (e.key === 'Escape') {
    closeSuggestions();
    return;
  }

  items.forEach((el, i) => el.classList.toggle('active', i === currentFocus));
});

// Close suggestions when clicking outside
document.addEventListener('click', (e) => {
  if (!e.target.closest('.search-wrapper')) closeSuggestions();
});

/* ── Search trigger ─────────────────────────────────────── */
function triggerSearch() {
  const q = searchInput.value.trim();
  state.query = q;
  state.page  = 1;
  closeSuggestions();
  loadCatalog();
}

searchBtn.addEventListener('click', triggerSearch);

/* ── Filters ────────────────────────────────────────────── */
filterBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    filterBtns.forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    state.type = btn.dataset.type;
    state.page = 1;
    loadCatalog();
  });
});

/* ── Pagination ─────────────────────────────────────────── */
prevBtn.addEventListener('click', () => {
  if (state.page > 1) { state.page--; loadCatalog(); scrollToTop(); }
});
nextBtn.addEventListener('click', () => {
  if (state.page < state.totalPages) { state.page++; loadCatalog(); scrollToTop(); }
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

/* ── Init ───────────────────────────────────────────────── */
loadCatalog();
