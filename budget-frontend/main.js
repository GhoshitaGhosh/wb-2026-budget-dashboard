import './style.css';

const BASE = import.meta.env.BASE_URL;
const PAGE_SIZE = 20;
const CRORE_DIVISOR = 10_000;
const money = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 1 });
const integer = new Intl.NumberFormat('en-IN');

const state = {
  metadata: null,
  departments: [],
  schemes: [],
  mapData: [],
  filtered: [],
  page: 1,
  selectedDepartmentId: null,
  mapLoaded: false
};

const el = id => document.getElementById(id);
const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
const croreFromThousand = value => value == null ? null : Number(value) / CRORE_DIVISOR;
const formatCrore = value => value == null ? 'Not available' : `₹${money.format(value)} cr`;
const formatThousandAsCrore = value => value == null ? 'Not reconciled' : formatCrore(croreFromThousand(value));
const percent = (value, total) => total ? `${(value / total * 100).toFixed(1)}%` : '—';

const labels = {
  official_budget_line: 'Official budget line',
  speech_announcement: 'Announcement',
  aggregated_programme: 'Aggregated programme',
  unmatched: 'Unmatched',
  stated: 'Announced amount stated',
  zero: 'Zero',
  token_provision: 'Token provision',
  not_stated: 'Not stated',
  not_classified: 'Not classified'
};

function metric(label, value, help) {
  return `<article class="metric"><div class="metric-value">${escapeHtml(value)}</div><div class="metric-label">${escapeHtml(label)}</div><p class="metric-help">${escapeHtml(help)}</p></article>`;
}

function renderHeadline() {
  const totals = state.metadata.totals;
  el('headline-metrics').innerHTML = [
    metric('Total expenditure', formatCrore(totals.totalExpenditureCrore), 'Budget estimate, 2026-27'),
    metric('Revenue receipts', formatCrore(totals.revenueReceiptsCrore), 'Taxes, non-tax income, and grants'),
    metric('Total receipts', formatCrore(totals.totalReceiptsCrore), 'Includes borrowing and loan recoveries'),
    metric('Official departments', integer.format(totals.departments), 'Canonical BP-3 department list')
  ].join('');
}

function renderTakeaways() {
  const totals = state.metadata.totals;
  const largest = [...state.departments].sort((a, b) => b.amount2026Thousand - a.amount2026Thousand)[0];
  const social = state.metadata.expenditure.find(item => item.name === 'Social Services');
  const debt = state.metadata.receipts.find(item => item.name.includes('Public Debt'));
  el('takeaways').innerHTML = `
    <article class="takeaway"><span class="kicker">Largest department envelope</span><strong>${escapeHtml(largest.name)}</strong><p>${formatThousandAsCrore(largest.amount2026Thousand)} in the BP-3 departmental estimate.</p></article>
    <article class="takeaway"><span class="kicker">Largest spending function</span><strong>${percent(social.crore, totals.totalExpenditureCrore)} social services</strong><p>${formatCrore(social.crore)} across health, education, welfare, and related services.</p></article>
    <article class="takeaway"><span class="kicker">Borrowing share</span><strong>${percent(debt.crore, totals.totalReceiptsCrore)} of receipts</strong><p>${formatCrore(debt.crore)} is public debt, shown separately from revenue receipts.</p></article>`;
}

function renderBars(containerId, tableId, items, total, includeType = false) {
  const sorted = [...items].sort((a, b) => b.crore - a.crore);
  const max = sorted[0]?.crore || 1;
  el(containerId).innerHTML = sorted.map(item => `
    <div class="bar-row">
      <div><div class="bar-meta"><span>${escapeHtml(item.name)}</span><strong>${percent(item.crore, total)}</strong></div><div class="bar-track" aria-hidden="true"><div class="bar-fill" style="width:${Math.max(1, item.crore / max * 100)}%"></div></div></div>
      <div class="number">${money.format(item.crore)}</div>
    </div>`).join('');
  el(tableId).innerHTML = sorted.map(item => `<tr><td>${escapeHtml(item.name)}</td>${includeType ? `<td>${item.kind === 'revenue' ? 'Revenue receipt' : 'Capital receipt'}</td>` : ''}<td class="number">${money.format(item.crore)}</td><td class="number">${percent(item.crore, total)}</td></tr>`).join('');
}

function renderDepartmentFocus(department) {
  state.selectedDepartmentId = department.id;
  document.querySelectorAll('.department-row').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.id === department.id)));
  const topThemes = department.themes.slice(0, 6);
  el('department-focus').innerHTML = `
    <p class="eyebrow">Department focus</p>
    <h3>${escapeHtml(department.name)}</h3>
    <div class="focus-value">${formatThousandAsCrore(department.amount2026Thousand)}</div>
    <p>2026-27 departmental budget estimate. Source: BP-3; stored in thousand rupees and displayed in crore.</p>
    <ul><li>${integer.format(department.schemeCount)} catalogue ${department.schemeCount === 1 ? 'entry' : 'entries'} currently associated</li><li>${topThemes.length ? `Themes: ${topThemes.map(escapeHtml).join(', ')}` : 'No catalogue themes assigned'}</li></ul>
    <button type="button" class="button primary" data-department-filter="${department.id}">View associated schemes</button>`;
  el('department-focus').querySelector('[data-department-filter]').addEventListener('click', () => {
    el('filter-department').value = department.id;
    applyFilters(true);
    el('schemes').scrollIntoView({ behavior: 'smooth' });
  });
}

function renderDepartments() {
  const sort = el('department-sort').value;
  const list = [...state.departments].sort((a, b) => sort === 'name' ? a.name.localeCompare(b.name) : sort === 'schemes' ? b.schemeCount - a.schemeCount || a.name.localeCompare(b.name) : b.amount2026Thousand - a.amount2026Thousand);
  el('department-ranking').innerHTML = list.map((department, index) => `
    <button type="button" class="department-row" data-id="${department.id}" aria-pressed="${department.id === state.selectedDepartmentId}">
      <span class="rank">${String(index + 1).padStart(2, '0')}</span><span class="dept-name">${escapeHtml(department.name)}</span><span class="dept-amount">${formatThousandAsCrore(department.amount2026Thousand)}</span>
    </button>`).join('');
  el('department-ranking').querySelectorAll('.department-row').forEach(button => button.addEventListener('click', () => renderDepartmentFocus(state.departments.find(item => item.id === button.dataset.id))));
  renderDepartmentFocus(state.departments.find(item => item.id === state.selectedDepartmentId) || list[0]);
}

function populateFilters() {
  const departmentSelect = el('filter-department');
  [...state.departments].sort((a, b) => a.name.localeCompare(b.name)).forEach(department => departmentSelect.add(new Option(department.name, department.id)));
  const themes = [...new Set(state.schemes.flatMap(item => item.themes))].sort();
  themes.forEach(theme => el('filter-theme').add(new Option(theme, theme)));
  const params = new URLSearchParams(location.search);
  el('filter-q').value = params.get('q') || '';
  el('filter-department').value = params.get('department') || '';
  el('filter-theme').value = params.get('theme') || '';
  el('filter-classification').value = params.get('status') || '';
  el('filter-amount').value = params.get('amountStatus') || '';
  el('filter-sort').value = params.get('sort') || 'amount-desc';
}

function readFilters() {
  return {
    q: el('filter-q').value.trim().toLowerCase(),
    department: el('filter-department').value,
    theme: el('filter-theme').value,
    classification: el('filter-classification').value,
    amountStatus: el('filter-amount').value,
    sort: el('filter-sort').value
  };
}

function syncUrl(filters) {
  const params = new URLSearchParams();
  if (filters.q) params.set('q', filters.q);
  if (filters.department) params.set('department', filters.department);
  if (filters.theme) params.set('theme', filters.theme);
  if (filters.classification) params.set('status', filters.classification);
  if (filters.amountStatus) params.set('amountStatus', filters.amountStatus);
  if (filters.sort !== 'amount-desc') params.set('sort', filters.sort);
  const query = params.toString();
  history.replaceState(null, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
}

function applyFilters(resetPage = false) {
  const filters = readFilters();
  if (resetPage) state.page = 1;
  state.filtered = state.schemes.filter(item => {
    const haystack = `${item.title} ${item.departmentName} ${item.summary} ${item.themes.join(' ')}`.toLowerCase();
    return (!filters.q || haystack.includes(filters.q)) &&
      (!filters.department || item.departmentId === filters.department) &&
      (!filters.theme || item.themes.includes(filters.theme)) &&
      (!filters.classification || item.classification === filters.classification) &&
      (!filters.amountStatus || item.amountStatus === filters.amountStatus);
  });
  state.filtered.sort((a, b) => filters.sort === 'name' ? a.title.localeCompare(b.title) : filters.sort === 'department' ? a.departmentName.localeCompare(b.departmentName) || a.title.localeCompare(b.title) : (b.financials.budget2026Thousand ?? b.announcedAmountThousand ?? -Infinity) - (a.financials.budget2026Thousand ?? a.announcedAmountThousand ?? -Infinity));
  syncUrl(filters);
  renderSchemeResults(filters);
}

function schemeAmount(item) {
  if (item.financials.budget2026Thousand != null) return { value: formatThousandAsCrore(item.financials.budget2026Thousand), note: 'Official BE' };
  if (item.announcedAmountThousand != null) return { value: formatThousandAsCrore(item.announcedAmountThousand), note: 'Announced; not reconciled' };
  if (item.amountStatus === 'zero') return { value: '₹0', note: 'Zero provision' };
  if (item.amountStatus === 'token_provision') return { value: 'Token', note: 'Nominal provision' };
  return { value: 'Not linked', note: labels[item.amountStatus] || 'Not available' };
}

function statusPill(item) {
  const className = item.matchStatus === 'reviewed' ? 'matched' : item.classification === 'speech_announcement' ? 'announcement' : '';
  return `<span class="status-pill ${className}">${escapeHtml(labels[item.classification] || item.classification)}</span>`;
}

function renderSchemeResults(filters = readFilters()) {
  const totalPages = Math.max(1, Math.ceil(state.filtered.length / PAGE_SIZE));
  state.page = Math.min(state.page, totalPages);
  const start = (state.page - 1) * PAGE_SIZE;
  const pageItems = state.filtered.slice(start, start + PAGE_SIZE);
  el('scheme-results').innerHTML = pageItems.length ? pageItems.map(item => {
    const amount = schemeAmount(item);
    return `<tr>
      <td data-label="Scheme"><button class="scheme-title-button" type="button" data-scheme-id="${item.id}">${escapeHtml(item.title)}</button><span class="subline">${escapeHtml(item.themes.slice(0, 3).join(' · ') || 'No theme assigned')}</span></td>
      <td data-label="Department">${escapeHtml(item.departmentName)}</td>
      <td data-label="Record status">${statusPill(item)}</td>
      <td data-label="Outlay" class="number"><strong>${escapeHtml(amount.value)}</strong><span class="subline">${escapeHtml(amount.note)}</span></td>
      <td><button class="text-button" type="button" data-scheme-id="${item.id}" aria-label="Open details for ${escapeHtml(item.title)}">Details</button></td>
    </tr>`;
  }).join('') : `<tr><td colspan="5"><strong>No records match these filters.</strong><span class="subline">Try removing a filter or searching a broader term.</span></td></tr>`;
  el('scheme-results').querySelectorAll('[data-scheme-id]').forEach(button => button.addEventListener('click', () => openScheme(button.dataset.schemeId)));
  el('scheme-count').textContent = integer.format(state.filtered.length);
  el('page-status').textContent = `Page ${state.page} of ${totalPages}`;
  el('previous-page').disabled = state.page <= 1;
  el('next-page').disabled = state.page >= totalPages;
  const active = [filters.q && `search “${filters.q}”`, filters.department && el('filter-department').selectedOptions[0]?.text, filters.theme, filters.classification && labels[filters.classification], filters.amountStatus && labels[filters.amountStatus]].filter(Boolean);
  el('active-filter-summary').textContent = active.length ? `Filtered by ${active.join(' · ')}` : 'All catalogue entries';
}

function financeCell(label, value) {
  return `<div><span>${label}</span><strong>${value == null ? 'Not available' : formatThousandAsCrore(value)}</strong></div>`;
}

function openScheme(id, updateHash = true) {
  const item = state.schemes.find(scheme => scheme.id === id);
  if (!item) return;
  const amount = schemeAmount(item);
  const sourceMarkup = item.sources.length ? item.sources.map(source => {
    const record = state.metadata.sources.find(entry => entry.id === source.sourceId);
    return `<a href="${escapeHtml(record?.url || '#')}" target="_blank" rel="noreferrer">${escapeHtml(record?.title || source.sourceId)}${source.page ? `, p. ${source.page}` : ''} ↗</a>`;
  }).join('<br>') : 'No exact official row has been reviewed for this entry yet.';
  el('detail-content').innerHTML = `
    <p class="eyebrow">${escapeHtml(item.departmentName)}</p><h2 id="detail-title">${escapeHtml(item.title)}</h2>
    <div class="detail-meta">${statusPill(item)}<span class="status-pill">${escapeHtml(labels[item.amountStatus] || item.amountStatus)}</span>${item.budgetCode ? `<span class="status-pill matched">${escapeHtml(item.budgetCode)}</span>` : ''}</div>
    <p class="detail-summary">${escapeHtml(item.summary)}</p>
    <div class="finance-grid">${financeCell('2024-25 actual', item.financials.actual2024Thousand)}${financeCell('2025-26 budget', item.financials.budget2025Thousand)}${financeCell('2025-26 revised', item.financials.revised2025Thousand)}${financeCell('2026-27 budget', item.financials.budget2026Thousand)}</div>
    <div class="detail-section"><h3>Published / announced amount</h3><p><strong>${escapeHtml(amount.value)}</strong> · ${escapeHtml(amount.note)}${item.announcedOutlayNote ? `<br>${escapeHtml(item.announcedOutlayNote)}` : ''}</p></div>
    <div class="detail-section"><h3>Themes</h3><p>${escapeHtml(item.themes.join(', ') || 'Not classified')}</p></div>
    <div class="detail-section"><h3>Source and reconciliation</h3><p>${sourceMarkup}</p></div>`;
  if (!el('detail-dialog').open) el('detail-dialog').showModal();
  document.body.classList.add('no-scroll');
  if (updateHash) history.replaceState(null, '', `${location.pathname}${location.search}#scheme=${id}`);
}

function closeScheme() {
  if (el('detail-dialog').open) el('detail-dialog').close();
  document.body.classList.remove('no-scroll');
  if (location.hash.startsWith('#scheme=')) history.replaceState(null, '', `${location.pathname}${location.search}`);
}

function csvFor(items) {
  const rows = [['id', 'title', 'department', 'record_type', 'match_status', 'amount_status', 'budget_2026_thousand_rupees', 'announced_amount_thousand_rupees', 'budget_code', 'themes', 'source_ids']];
  items.forEach(item => rows.push([item.id, item.title, item.departmentName, item.classification, item.matchStatus, item.amountStatus, item.financials.budget2026Thousand, item.announcedAmountThousand, item.budgetCode, item.themes.join('|'), item.sources.map(source => source.sourceId).join('|')]));
  return rows.map(row => row.map(value => {
    const text = value == null ? '' : String(value);
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }).join(',')).join('\n');
}

function downloadCsv(items, filename) {
  const url = URL.createObjectURL(new Blob([`\uFEFF${csvFor(items)}`], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url; anchor.download = filename; document.body.appendChild(anchor); anchor.click(); anchor.remove(); URL.revokeObjectURL(url);
}

function renderSources() {
  const primary = state.metadata.sources.filter(source => ['bp-3', 'bp-9', 'bp-31', 'budget-speech-en'].includes(source.id));
  el('source-list').innerHTML = primary.map(source => `<div class="source-item"><span><strong>${escapeHtml(source.title)}</strong><br>${escapeHtml(source.purpose)}</span><a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer">Open ↗</a></div>`).join('');
  const totals = state.metadata.totals;
  el('quality-summary').textContent = `${integer.format(totals.legacyCatalogueEntries)} legacy catalogue entries are retained alongside ${integer.format(totals.officialBudgetRows)} extracted BP-3 budget rows. ${integer.format(totals.reconciledLegacyEntries)} legacy entries have a unique exact-title BP-3 match; the remainder stay explicitly labelled. Unreviewed amounts are never presented as official budget estimates.`;
  el('map-coverage').textContent = `${integer.format(totals.mappedEntries)} of ${integer.format(totals.catalogueEntries)} entries contain a location reference. Coordinates are currently approximate legacy geocoding, not a measure of district allocation.`;
}

async function loadMap() {
  if (state.mapLoaded) return;
  el('load-map').disabled = true;
  el('load-map').textContent = 'Loading map…';
  const [{ default: L }] = await Promise.all([import('leaflet'), import('leaflet/dist/leaflet.css')]);
  await Promise.all([import('leaflet.markercluster'), import('leaflet.markercluster/dist/MarkerCluster.css'), import('leaflet.markercluster/dist/MarkerCluster.Default.css')]);
  el('budget-map').classList.remove('map-placeholder');
  el('budget-map').innerHTML = '';
  const map = L.map('budget-map', { minZoom: 6, maxBounds: [[20.5, 84.5], [28, 90.5]], maxBoundsViscosity: 1 }).setView([23.5, 87.8], 7);
  L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', { maxZoom: 19, attribution: '&copy; OpenStreetMap contributors &copy; CARTO' }).addTo(map);
  const clusters = L.markerClusterGroup({ showCoverageOnHover: false, maxClusterRadius: 42 });
  state.mapData.forEach(item => item.locations.forEach(location => {
    const marker = L.circleMarker([location.latitude, location.longitude], { radius: 7, color: '#fffdf8', weight: 2, fillColor: '#b84a2b', fillOpacity: .95 });
    marker.bindPopup(`<strong>${escapeHtml(item.title)}</strong><br>${escapeHtml(item.departmentName)}<br><small>${escapeHtml(location.name)} · approximate location</small>`);
    clusters.addLayer(marker);
  }));
  map.addLayer(clusters);
  state.mapLoaded = true;
  el('load-map').textContent = 'Map loaded';
}

function setupTheme() {
  const saved = localStorage.getItem('budget-theme');
  const initial = saved || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  document.documentElement.dataset.theme = initial;
  updateThemeButton();
  el('theme-toggle').addEventListener('click', () => {
    document.documentElement.dataset.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
    localStorage.setItem('budget-theme', document.documentElement.dataset.theme);
    updateThemeButton();
  });
}

function updateThemeButton() {
  const dark = document.documentElement.dataset.theme === 'dark';
  el('theme-toggle').setAttribute('aria-pressed', String(dark));
  el('theme-toggle').setAttribute('aria-label', `Switch to ${dark ? 'light' : 'dark'} theme`);
  el('theme-toggle').querySelector('.theme-label').textContent = dark ? 'Light' : 'Dark';
}

function bindEvents() {
  el('department-sort').addEventListener('change', renderDepartments);
  el('scheme-filters').addEventListener('input', event => { if (event.target.matches('input')) applyFilters(true); });
  el('scheme-filters').addEventListener('change', event => { if (event.target.matches('select')) applyFilters(true); });
  el('clear-filters').addEventListener('click', () => { el('scheme-filters').reset(); applyFilters(true); });
  el('previous-page').addEventListener('click', () => { state.page -= 1; renderSchemeResults(); el('schemes-title').scrollIntoView(); });
  el('next-page').addEventListener('click', () => { state.page += 1; renderSchemeResults(); el('schemes-title').scrollIntoView(); });
  el('download-filtered').addEventListener('click', () => downloadCsv(state.filtered, 'west-bengal-budget-filtered.csv'));
  el('download-all').addEventListener('click', () => downloadCsv(state.schemes, 'west-bengal-budget-schemes.csv'));
  el('detail-close').addEventListener('click', closeScheme);
  el('detail-dialog').addEventListener('click', event => { if (event.target === el('detail-dialog')) closeScheme(); });
  el('detail-dialog').addEventListener('close', () => { document.body.classList.remove('no-scroll'); });
  el('load-map').addEventListener('click', () => loadMap().catch(error => { console.error(error); el('load-map').disabled = false; el('load-map').textContent = 'Try loading map again'; }));
  window.addEventListener('hashchange', () => { if (location.hash.startsWith('#scheme=')) openScheme(location.hash.slice(8), false); });
}

async function init() {
  setupTheme();
  try {
    const responses = await Promise.all(['metadata.json', 'departments.json', 'schemes.json', 'map-data.json'].map(file => fetch(`${BASE}${file}`)));
    if (responses.some(response => !response.ok)) throw new Error('A dashboard data file could not be loaded.');
    [state.metadata, state.departments, state.schemes, state.mapData] = await Promise.all(responses.map(response => response.json()));
    renderHeadline(); renderTakeaways();
    renderBars('receipts-bars', 'receipts-table', state.metadata.receipts, state.metadata.totals.totalReceiptsCrore, true);
    renderBars('spending-bars', 'spending-table', state.metadata.expenditure, state.metadata.totals.totalExpenditureCrore);
    renderDepartments(); populateFilters(); applyFilters(); renderSources(); bindEvents();
    if (location.hash.startsWith('#scheme=')) openScheme(location.hash.slice(8), false);
  } catch (error) {
    console.error(error);
    el('headline-metrics').innerHTML = '<p role="alert">The dashboard data could not be loaded. Please refresh or consult the official publication index.</p>';
  }
}

init();
