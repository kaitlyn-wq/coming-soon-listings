const grid = document.getElementById('listingsGrid');
const emptyState = document.getElementById('emptyState');
const modal = document.getElementById('formModal');
const form = document.getElementById('listingForm');
const formError = document.getElementById('formError');

document.getElementById('openFormBtn').addEventListener('click', () => {
  modal.hidden = false;
});
document.getElementById('closeFormBtn').addEventListener('click', closeModal);
document.getElementById('cancelFormBtn').addEventListener('click', closeModal);
modal.addEventListener('click', (e) => {
  if (e.target === modal) closeModal();
});

function closeModal() {
  modal.hidden = true;
  form.reset();
  formError.hidden = true;
}

function formatDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function renderListings(listings) {
  grid.innerHTML = '';
  emptyState.hidden = listings.length !== 0;

  for (const listing of listings) {
    const card = document.createElement('div');
    card.className = 'listing-card';

    let photosHtml = '<div class="no-photo">No photos yet</div>';
    if (listing.photos && listing.photos.length) {
      const shown = listing.photos.slice(0, 3);
      const single = shown.length === 1;
      photosHtml = `<div class="listing-photos ${single ? 'single' : ''}">` +
        shown.map((f, i) => `<img class="${i === 0 && !single ? 'main-photo' : ''}" src="/uploads/${encodeURIComponent(f)}" alt="Property photo" />`).join('') +
        `</div>`;
    }

    const highlightsHtml = (listing.highlights || []).length
      ? `<ul class="listing-highlights">${listing.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>`
      : '';

    const locationParts = [listing.city, listing.state].filter(Boolean).join(', ');

    card.innerHTML = `
      ${photosHtml}
      <div class="listing-body">
        <p class="listing-address">${escapeHtml(listing.address)}</p>
        ${locationParts ? `<p class="listing-location">${escapeHtml(locationParts)}</p>` : ''}
        ${listing.price ? `<p class="listing-price">${escapeHtml(listing.price)}</p>` : ''}
        <p class="listing-date">Coming soon &mdash; lists ${formatDate(listing.listDate)}</p>
        ${highlightsHtml}
        ${listing.agentName ? `<p class="listing-agent">Posted by ${escapeHtml(listing.agentName)}</p>` : ''}
      </div>
    `;
    grid.appendChild(card);
  }
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

async function loadListings() {
  try {
    const res = await fetch('/api/listings');
    const listings = await res.json();
    renderListings(listings);
  } catch (err) {
    console.error('Failed to load listings', err);
  }
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  formError.hidden = true;

  const formData = new FormData(form);

  try {
    const res = await fetch('/api/listings', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Failed to post listing.');
    }

    closeModal();
    await loadListings();
  } catch (err) {
    formError.textContent = err.message;
    formError.hidden = false;
  }
});

loadListings();
// Refresh periodically so everyone's view stays current without a manual reload
setInterval(loadListings, 60 * 1000);
