import './style.css'; // Let Vite handle it
import Chart from 'chart.js/auto';
import { WordCloudController, WordElement } from 'chartjs-chart-wordcloud';

Chart.register(WordCloudController, WordElement);

let globalData = null;
let chartsData = null;
let allSchemes = [];
let uniqueTags = new Set();
let activeTags = new Set();
let currentSearchQuery = '';

// DOM Elements
const sidebarNavDepts = document.getElementById('nav-departments');
const departmentsContainer = document.getElementById('departments-container');
const globalSearchInput = document.getElementById('global-search');
const searchResultsSection = document.getElementById('search-results-section');
const searchSchemesContainer = document.getElementById('search-schemes-container');
const searchTitle = document.getElementById('search-title');
const overviewSection = document.getElementById('overview-section');
const themeToggle = document.getElementById('theme-toggle');
const sidebarToggleBtn = document.getElementById('sidebar-toggle');
const sidebar = document.getElementById('sidebar');
const mainContent = document.getElementById('main-content');
const topNav = document.querySelector('.top-nav');

// Tag UI Elements
const tagSelectWrapper = document.getElementById('tag-select-wrapper');
const tagSelectDisplay = document.getElementById('tag-select-display');
const tagSearchInput = document.getElementById('tag-search-input');
const tagDropdownList = document.getElementById('tag-dropdown-list');
const activeTagsContainer = document.getElementById('active-tags-container');

// Charts
let sdgChartInstance = null;
let deptChartInstance = null;
let revenueChartInstance = null;
let expenditureChartInstance = null;
let departmentOutlayChartInstance = null;
let wordCloudChartInstance = null;

// Intersection Observer for scroll spy
const observerOptions = {
  root: null,
  rootMargin: '-20% 0px -60% 0px',
  threshold: 0
};

const scrollObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const id = entry.target.id;
      document.querySelectorAll('.nav-item').forEach(nav => {
        nav.classList.remove('active');
        if (nav.getAttribute('href') === `#${id}`) {
          nav.classList.add('active');
          // Scroll sidebar to keep active item in view only if visible
          if (!sidebar.classList.contains('collapsed') && window.innerWidth > 900) {
              nav.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
          }
        }
      });
    }
  });
}, observerOptions);

// Animation Observer - simple trigger for entries moving into view
const animationObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      // Stop observing once visible to prevent re-triggering constantly
      animationObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.05, rootMargin: '0px 0px -50px 0px' });

// Emoji Mapping Helpers
const getDeptEmoji = (name) => {
  const n = name.toLowerCase();
  if (n.includes('health') || n.includes('medical')) return '🏥';
  if (n.includes('educat') || n.includes('school') || n.includes('high')) return '🎓';
  if (n.includes('agri') || n.includes('farm')) return '🌾';
  if (n.includes('financ') || n.includes('tax')) return '💰';
  if (n.includes('women') || n.includes('child')) return '👩‍👧';
  if (n.includes('industr') || n.includes('commerce') || n.includes('enterprise')) return '🏭';
  if (n.includes('information') || n.includes('tech')) return '💻';
  if (n.includes('touris')) return '🏖️';
  if (n.includes('water') || n.includes('irrigation')) return '💧';
  if (n.includes('transport') || n.includes('road')) return '🛣️';
  if (n.includes('urban') || n.includes('municipal')) return '🏙️';
  if (n.includes('rural') || n.includes('panchayat')) return '🏡';
  if (n.includes('police') || n.includes('home') || n.includes('law')) return '🚓';
  if (n.includes('power') || n.includes('energy')) return '⚡';
  if (n.includes('forest') || n.includes('environment')) return '🌳';
  if (n.includes('food') || n.includes('civil supplies')) return '🍚';
  if (n.includes('sports') || n.includes('youth')) return '⚽';
  if (n.includes('labour') || n.includes('employment')) return '👷';
  if (n.includes('art') || n.includes('culture') || n.includes('library')) return '🎨';
  if (n.includes('housing')) return '🏠';
  return '🏛️';
};

const getSchemeEmoji = (name, details) => {
  const text = (name + ' ' + details).toLowerCase();
  if (text.includes('scholarship') || text.includes('student')) return '🎒';
  if (text.includes('pension') || text.includes('old age')) return '🧓';
  if (text.includes('loan') || text.includes('credit')) return '💳';
  if (text.includes('digital') || text.includes('portal') || text.includes('app')) return '📱';
  if (text.includes('skill') || text.includes('train')) return '🛠️';
  if (text.includes('health') || text.includes('hospital') || text.includes('medicine')) return '💊';
  if (text.includes('women') || text.includes('girl')) return '🚺';
  if (text.includes('water') || text.includes('drinking')) return '🚰';
  if (text.includes('road') || text.includes('highway') || text.includes('bridge') || text.includes('infrastructure')) return '🚧';
  if (text.includes('farm') || text.includes('crop') || text.includes('seed')) return '🌱';
  if (text.includes('solar') || text.includes('energy')) return '☀️';
  if (text.includes('fund') || text.includes('grant') || text.includes('subsidy')) return '💸';
  return '🔸';
};

// Initialize
async function init() {
  try {
    const [dataRes, chartsDataRes] = await Promise.all([
      fetch('./data.json'),
      fetch('./charts_data.json')
    ]);
    
    if (!dataRes.ok) throw new Error('Failed to load data.json');
    if (!chartsDataRes.ok) throw new Error('Failed to load charts_data.json');
    
    globalData = await dataRes.json();
    chartsData = await chartsDataRes.json();
    
    // Sort departments alphabetically, but keep 'Multiple Departments / Uncategorized' at the bottom
    globalData.departments.sort((a, b) => {
      if (a.name === 'Multiple Departments / Uncategorized') return 1;
      if (b.name === 'Multiple Departments / Uncategorized') return -1;
      return a.name.localeCompare(b.name);
    });
    
    // Flatten schemes and collect tags
    globalData.departments.forEach((dept, i) => {
      dept.id = `dept-${i}-${dept.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
      dept.emoji = getDeptEmoji(dept.name);
      
      dept.schemes.forEach(scheme => {
        if (scheme.tags) {
          scheme.tags.forEach(tag => uniqueTags.add(tag));
        }
        scheme.emoji = getSchemeEmoji(scheme.name, scheme.details);
        allSchemes.push({ ...scheme, departmentName: dept.name, departmentId: dept.id, deptEmoji: dept.emoji });
      });
    });

    setupTheme();
    setupSidebarToggle();
    updateStats();
    setupTagSelector();
    renderContent(); // Initially render all
    initCharts();
    setupSearch();
    
    // Observe statically placed animated elements
    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      animationObserver.observe(el);
    });

  } catch (error) {
    console.error('Error loading data:', error);
    departmentsContainer.innerHTML = '<div style="padding: 2rem; color: red;">Error loading budget data.</div>';
  }
}

function setupTheme() {
  const currentTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);

  themeToggle.addEventListener('click', () => {
    let theme = document.documentElement.getAttribute('data-theme');
    let targetTheme = theme === 'light' ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', targetTheme);
    localStorage.setItem('theme', targetTheme);
    
    if (sdgChartInstance) sdgChartInstance.update();
    if (deptChartInstance) deptChartInstance.update();
    if (revenueChartInstance) revenueChartInstance.update();
    if (expenditureChartInstance) expenditureChartInstance.update();
    if (departmentOutlayChartInstance) departmentOutlayChartInstance.update();
    if (wordCloudChartInstance) wordCloudChartInstance.update();
  });
}

function setupSidebarToggle() {
  sidebarToggleBtn.addEventListener('click', () => {
    if (window.innerWidth <= 900) {
      sidebar.classList.toggle('open');
    } else {
      sidebar.classList.toggle('collapsed');
      mainContent.classList.toggle('expanded');
      topNav.classList.toggle('expanded');
    }
  });

  // Close sidebar on link click (mobile)
  document.addEventListener('click', (e) => {
    if (window.innerWidth <= 900) {
      if (e.target.closest('.nav-item')) {
        sidebar.classList.remove('open');
      } else if (!e.target.closest('.sidebar') && !e.target.closest('#sidebar-toggle')) {
        sidebar.classList.remove('open');
      }
    }
  });
}

function updateStats() {
  if (chartsData && chartsData.department_outlays) {
    document.getElementById('stat-depts').textContent = Object.keys(chartsData.department_outlays).length;
  } else {
    document.getElementById('stat-depts').textContent = globalData.departments.length;
  }
  
  document.getElementById('stat-schemes').textContent = allSchemes.length;
  
  if (globalData.sdgs && globalData.sdgs.length > 0) {
    const totalSdg = globalData.sdgs.reduce((sum, sdg) => sum + sdg.allocation_crore, 0);
    document.getElementById('stat-total-sdg').textContent = `₹${Math.round(totalSdg).toLocaleString('en-IN')} Cr`;
  }

  if (chartsData) {
    const totalRevEl = document.getElementById('stat-total-revenue');
    if (totalRevEl && chartsData.total_revenue) {
      totalRevEl.textContent = `₹${Math.round(chartsData.total_revenue).toLocaleString('en-IN')} Cr`;
    }

    const totalExpEl = document.getElementById('stat-total-expenditure');
    if (totalExpEl && chartsData.total_expenditure) {
      totalExpEl.textContent = `₹${Math.round(chartsData.total_expenditure).toLocaleString('en-IN')} Cr`;
    }
  }
}

function setupTagSelector() {
  const sortedTags = Array.from(uniqueTags).sort();
  
  const renderDropdownList = (query = '') => {
    tagDropdownList.innerHTML = '';
    const filtered = sortedTags.filter(t => t.toLowerCase().includes(query.toLowerCase()));
    
    if (filtered.length === 0) {
      tagDropdownList.innerHTML = '<div style="padding: 0.75rem 1.25rem; color: var(--text-tertiary); font-size: 0.875rem;">No tags found</div>';
      return;
    }
    
    filtered.forEach(tag => {
      const item = document.createElement('div');
      item.className = 'dropdown-item' + (activeTags.has(tag) ? ' selected' : '');
      item.innerHTML = `
        <span>${tag}</span>
        ${activeTags.has(tag) ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}
      `;
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleTag(tag);
        // keep dropdown open but re-render list to show checkmark
        renderDropdownList(tagSearchInput.value);
      });
      tagDropdownList.appendChild(item);
    });
  };

  const renderActiveChips = () => {
    activeTagsContainer.innerHTML = '';
    activeTags.forEach(tag => {
      const chip = document.createElement('div');
      chip.className = 'tag-chip';
      chip.innerHTML = `
        <span>${tag}</span>
        <button class="tag-remove" aria-label="Remove tag">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      `;
      chip.querySelector('.tag-remove').addEventListener('click', () => {
        toggleTag(tag);
        renderDropdownList(tagSearchInput.value);
      });
      activeTagsContainer.appendChild(chip);
    });
    
    const displaySpan = tagSelectDisplay.querySelector('span');
    if (activeTags.size > 0) {
      displaySpan.textContent = `${activeTags.size} tag${activeTags.size > 1 ? 's' : ''} selected...`;
    } else {
      displaySpan.textContent = 'Add a filter tag...';
    }
  };

  const toggleTag = (tag) => {
    if (activeTags.has(tag)) {
      activeTags.delete(tag);
    } else {
      activeTags.add(tag);
    }
    renderActiveChips();
    applyFilters();
  };

  // Event Listeners
  tagSelectDisplay.addEventListener('click', (e) => {
    e.stopPropagation();
    tagSelectWrapper.classList.toggle('open');
    tagSelectDisplay.classList.toggle('open');
    if (tagSelectWrapper.classList.contains('open')) {
      tagSearchInput.focus();
    }
  });

  tagSearchInput.addEventListener('input', (e) => {
    renderDropdownList(e.target.value);
  });

  // Close dropdown when clicking outside
  document.addEventListener('click', (e) => {
    if (!tagSelectWrapper.contains(e.target)) {
      tagSelectWrapper.classList.remove('open');
      tagSelectDisplay.classList.remove('open');
    }
  });

  // Initial render
  renderDropdownList();
  renderActiveChips();
}

function generateSchemeCard(scheme) {
  const tagsHtml = scheme.tags && scheme.tags.length > 0 
    ? `<div class="scheme-tags">${scheme.tags.map(tag => `<span class="tag">${tag}</span>`).join('')}</div>`
    : '';
    
  const outlayHtml = scheme.outlay 
    ? `<div class="scheme-outlay">${scheme.outlay}</div>`
    : '';
    
  const deptHtml = scheme.departmentName && (!document.getElementById(scheme.departmentId) || document.getElementById(scheme.departmentId).style.display === 'none') 
    ? `<div class="scheme-dept">${scheme.deptEmoji || '🏛️'} ${scheme.departmentName}</div>`
    : `<div class="scheme-dept">Initiative</div>`;

  return `
    <div class="scheme-card animate-on-scroll">
      ${deptHtml}
      <h3 class="scheme-title">${scheme.emoji || '🔸'} ${scheme.name}</h3>
      ${outlayHtml}
      <p class="scheme-details">${scheme.details}</p>
      ${tagsHtml}
    </div>
  `;
}

// Renders the standard scrollable list of departments
function renderContent(filteredDepartments = globalData.departments) {
  sidebarNavDepts.innerHTML = '';
  departmentsContainer.innerHTML = '';
  
  scrollObserver.observe(overviewSection);

  let schemeCount = 0;

  filteredDepartments.forEach(dept => {
    if (dept.schemes.length === 0) return;
    schemeCount += dept.schemes.length;

    // Sidebar Link
    const navItem = document.createElement('a');
    navItem.href = `#${dept.id}`;
    navItem.className = 'nav-item';
    navItem.textContent = `${dept.emoji} ${dept.name}`;
    sidebarNavDepts.appendChild(navItem);

    // Section
    const section = document.createElement('section');
    section.id = dept.id;
    section.className = 'content-section';
    
    section.innerHTML = `
      <header class="section-header glass-header dept-header animate-on-scroll">
        <h1>${dept.emoji} ${dept.name}</h1>
        <p>${dept.schemes.length} Initiative${dept.schemes.length !== 1 ? 's' : ''}</p>
      </header>
      <div class="schemes-grid">
        ${dept.schemes.map(scheme => generateSchemeCard(scheme)).join('')}
      </div>
    `;
    
    departmentsContainer.appendChild(section);
    scrollObserver.observe(section);
  });
  
  if (filteredDepartments.length === 0) {
      departmentsContainer.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 5rem 2rem; animation: fadeIn 0.4s ease-out;">
           <div style="color: var(--primary-color-light); margin-bottom: 1.5rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
           </div>
           <h3 style="color: var(--text-secondary); margin-bottom: 0.5rem; font-size: 1.5rem;">No initiatives found</h3>
           <p style="color: var(--text-tertiary); max-width: 400px; margin: 0 auto 2rem auto; line-height: 1.5;">We couldn't find any schemes matching your selected tags.</p>
           <button onclick="window.location.reload()" style="background: var(--primary-color); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 50px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-sm);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)';">Clear All Filters</button>
        </div>
      `;
  }

  const resultsCountNum = document.getElementById('results-count-num');
  if (resultsCountNum) {
      resultsCountNum.textContent = schemeCount;
  }

  // After adding dynamic content, tell the animation observer to watch them
  document.querySelectorAll('#departments-container .animate-on-scroll').forEach(el => {
    animationObserver.observe(el);
  });
}

function applyFilters() {
  if (currentSearchQuery.length >= 2) {
    performSearch(currentSearchQuery);
    return;
  }
  
  if (activeTags.size === 0) {
    renderContent(globalData.departments);
    return;
  }

  const filteredDepartments = [];
  globalData.departments.forEach(dept => {
    const filteredSchemes = dept.schemes.filter(scheme => {
      if (!scheme.tags) return false;
      return scheme.tags.some(tag => activeTags.has(tag));
    });

    if (filteredSchemes.length > 0) {
      filteredDepartments.push({
        ...dept,
        schemes: filteredSchemes
      });
    }
  });

  renderContent(filteredDepartments);
}

function performSearch(query) {
  if (query.length < 2) {
    searchResultsSection.style.display = 'none';
    overviewSection.style.display = 'block';
    departmentsContainer.style.display = 'block';
    applyFilters(); 
    return;
  }

  const filteredSchemes = allSchemes.filter(scheme => {
    const matchName = scheme.name.toLowerCase().includes(query);
    const matchDetails = scheme.details.toLowerCase().includes(query);
    const matchText = matchName || matchDetails || scheme.departmentName.toLowerCase().includes(query);
    
    if (activeTags.size > 0) {
        const hasTag = scheme.tags && scheme.tags.some(tag => activeTags.has(tag));
        return matchText && hasTag;
    }
    
    return matchText;
  });

  overviewSection.style.display = 'none';
  departmentsContainer.style.display = 'none';
  searchResultsSection.style.display = 'block';
  
  searchTitle.textContent = `Search Results (${filteredSchemes.length})`;
  document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));

  if (filteredSchemes.length === 0) {
      searchSchemesContainer.innerHTML = `
        <div class="empty-state" style="text-align: center; padding: 5rem 2rem; animation: fadeIn 0.4s ease-out;">
           <div style="color: var(--primary-color-light); margin-bottom: 1.5rem;">
              <svg xmlns="http://www.w3.org/2000/svg" width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="opacity: 0.8;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line><line x1="11" y1="8" x2="11" y2="14"></line><line x1="8" y1="11" x2="14" y2="11"></line></svg>
           </div>
           <h3 style="color: var(--text-secondary); margin-bottom: 0.5rem; font-size: 1.5rem;">No initiatives found</h3>
           <p style="color: var(--text-tertiary); max-width: 400px; margin: 0 auto 2rem auto; line-height: 1.5;">We couldn't find any schemes matching your search query.</p>
           <button onclick="window.clearSearch()" style="background: var(--primary-color); color: white; border: none; padding: 0.75rem 1.5rem; border-radius: 50px; font-weight: 600; cursor: pointer; transition: all 0.2s; box-shadow: var(--shadow-sm);" onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='var(--shadow-md)';" onmouseout="this.style.transform='none'; this.style.boxShadow='var(--shadow-sm)';">Clear Search</button>
        </div>
      `;
  } else {
      searchSchemesContainer.innerHTML = filteredSchemes.map(s => {
        const searchScheme = {...s, departmentId: null}; 
        return generateSchemeCard(searchScheme);
      }).join('');
      
      // Observe new cards in search results
      document.querySelectorAll('#search-schemes-container .animate-on-scroll').forEach(el => {
        animationObserver.observe(el);
      });
  }
}

function setupSearch() {
  globalSearchInput.addEventListener('input', (e) => {
    currentSearchQuery = e.target.value.toLowerCase().trim();
    performSearch(currentSearchQuery);
  });
}

// Attach a global helper for the clear button empty state
window.clearSearch = function() {
  const input = document.getElementById('global-search');
  if (input) {
    input.value = '';
  }
  currentSearchQuery = '';
  performSearch('');
};

function initCharts() {
  const getTextColor = () => document.documentElement.getAttribute('data-theme') === 'dark' ? '#e6edf3' : '#4b5563';
  const getGridColor = () => document.documentElement.getAttribute('data-theme') === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';

  Chart.defaults.color = getTextColor();
  Chart.defaults.font.family = "'Inter', sans-serif";

  const sdgCtx = document.getElementById('sdgChart');
  if (sdgCtx && globalData.sdgs.length > 0) {
    const labels = globalData.sdgs.map(s => s.id);
    const data = globalData.sdgs.map(s => s.allocation_crore);

    sdgChartInstance = new Chart(sdgCtx, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Allocation (Crore ₹)',
          data: data,
          backgroundColor: '#f28500',
          hoverBackgroundColor: '#db7700',
          borderRadius: 8,
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleFont: { size: 14, family: 'Outfit' },
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              title: (context) => globalData.sdgs[context[0].dataIndex].name,
              label: (context) => `₹${context.raw.toLocaleString('en-IN')} Crore`
            }
          }
        },
        scales: {
          y: {
            grid: { color: getGridColor, drawBorder: false },
            ticks: { color: getTextColor, callback: (value) => value / 1000 + 'k' }
          },
          x: {
            grid: { display: false, drawBorder: false },
            ticks: { color: getTextColor, maxRotation: 45, minRotation: 45 }
          }
        }
      }
    });
  }

  const deptCtx = document.getElementById('deptChart');
  if (deptCtx && globalData.departments.length > 0) {
    const sorted = [...globalData.departments]
      .filter(d => d.schemes.length > 0)
      .sort((a, b) => b.schemes.length - a.schemes.length)
      .slice(0, 10);
      
    const labels = sorted.map(d => d.name.length > 25 ? d.name.substring(0, 22) + '...' : d.name);
    const data = sorted.map(d => d.schemes.length);

    deptChartInstance = new Chart(deptCtx, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: [
            '#ff9933', '#f28500', '#e67300', '#d96200', '#cc5200', 
            '#bf4100', '#b33000', '#a62000', '#991000', '#8c0000'
          ],
          borderWidth: 2,
          borderColor: () => document.documentElement.getAttribute('data-theme') === 'dark' ? '#161b22' : '#ffffff',
          hoverOffset: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '75%',
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => ` ${context.raw} Schemes`
            }
          }
        }
      }
    });
  }

  // --- NEW CHARTS: MACRO BUDGET OVERVIEW ---

  if (chartsData) {
    const revCtx = document.getElementById('revenueChart');
    if (revCtx) {
      const revLabels = [];
      const revData = [];
      Object.entries(chartsData.state_tax_breakdown).forEach(([k,v]) => { revLabels.push(k); revData.push(v); });
      Object.entries(chartsData.central_tax_breakdown).forEach(([k,v]) => { revLabels.push(k); revData.push(v); });
      Object.entries(chartsData.non_tax_breakdown).forEach(([k,v]) => { revLabels.push(k); revData.push(v); });
      revLabels.push('Grants-in-Aid (Centre)', 'Public Debt (Borrowings)', 'Loan Recoveries');
      revData.push(
        chartsData.revenue_sources['Grants-in-Aid (Centre)'], 
        chartsData.revenue_sources['Public Debt (Borrowings)'], 
        chartsData.revenue_sources['Loan Recoveries']
      );
      const revBgColors = [
              '#e65100', '#ef6c00', '#f57c00', '#fb8c00', '#ff9800', '#ffa726', '#ffb74d', '#ffcc80',
              '#1565c0', '#1976d2', '#1e88e5', '#2196f3', '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb',
              '#2e7d32', '#388e3c', '#43a047', '#4caf50', '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9'
            ];

      revenueChartInstance = new Chart(revCtx, {
        type: 'pie',
        data: {
          labels: revLabels,
          datasets: [{
            data: revData,
            backgroundColor: revBgColors,
            borderWidth: 2,
            borderColor: () => document.documentElement.getAttribute('data-theme') === 'dark' ? '#161b22' : '#ffffff',
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => ' ₹' + context.raw.toLocaleString('en-IN') + ' Cr'
              }
            }
          }
        }
      });
      buildCustomLegend(revenueChartInstance, revLabels, revData, revBgColors, 'customRevLegend');
    }

    const expCtx = document.getElementById('expenditureChart');
    if (expCtx) {
      const expLabels = Object.keys(chartsData.expenditure_breakdown);
      const expData = Object.values(chartsData.expenditure_breakdown);
      const expBgColors = ['#d32f2f', '#1976d2', '#388e3c', '#fbc02d', '#7b1fa2'];
      expenditureChartInstance = new Chart(expCtx, {
        type: 'pie',
        data: {
          labels: expLabels,
          datasets: [{
            data: expData,
            backgroundColor: expBgColors,
            borderWidth: 2,
            borderColor: () => document.documentElement.getAttribute('data-theme') === 'dark' ? '#161b22' : '#ffffff',
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                label: (context) => ' ₹' + context.raw.toLocaleString('en-IN') + ' Cr'
              }
            }
          }
        }
      });
      buildCustomLegend(expenditureChartInstance, expLabels, expData, expBgColors, 'customExpLegend');
    }

    const deptOutlayCtx = document.getElementById('departmentOutlayChart');
    if (deptOutlayCtx) {
      const sortedOutlays = Object.entries(chartsData.department_outlays);
      const labels = sortedOutlays.map(d => d[0].length > 25 ? d[0].substring(0, 25) + '...' : d[0]);
      const data = sortedOutlays.map(d => d[1]);
      const backgroundColors = [
              '#e65100', '#ef6c00', '#f57c00', '#fb8c00', '#ff9800', '#ffa726', '#ffb74d', '#ffcc80',
              '#1565c0', '#1976d2', '#1e88e5', '#2196f3', '#42a5f5', '#64b5f6', '#90caf9', '#bbdefb',
              '#2e7d32', '#388e3c', '#43a047', '#4caf50', '#66bb6a', '#81c784', '#a5d6a7', '#c8e6c9',
              '#c62828', '#d32f2f', '#e53935', '#f44336', '#ef5350', '#e57373', '#ef9a9a', '#ffcdd2',
              '#6a1b9a', '#7b1fa2', '#8e24aa', '#9c27b0', '#ab47bc', '#ba68c8', '#ce93d8', '#e1bee7',
              '#00695c', '#00796b', '#00897b', '#009688', '#26a69a', '#4db6ac', '#80cbc4', '#b2dfdb',
              '#f9a825', '#fbc02d', '#fdd835', '#ffeb3b', '#ffee58', '#fff176', '#fff59d', '#fff9c4'
      ];
      
      departmentOutlayChartInstance = new Chart(deptOutlayCtx, {
        type: 'pie',
        data: {
          labels: labels,
          datasets: [{
            data: data,
            backgroundColor: backgroundColors,
            borderWidth: 1,
            borderColor: () => document.documentElement.getAttribute('data-theme') === 'dark' ? '#161b22' : '#ffffff',
            hoverOffset: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { display: false },
            tooltip: {
              callbacks: {
                title: (context) => sortedOutlays[context[0].dataIndex][0],
                label: (context) => {
                  const val = context.raw;
                  const total = data.reduce((a, b) => a + b, 0);
                  const percentage = ((val / total) * 100).toFixed(2);
                  return ' ₹' + val.toLocaleString('en-IN') + ' Cr (' + percentage + '%)';
                }
              }
            }
          }
        }
      });

      buildCustomLegend(departmentOutlayChartInstance, labels, data, backgroundColors, 'customDeptLegend');
    }
  }
}

function buildCustomLegend(chartInstance, labels, data, backgroundColors, containerId) {
  const legendContainer = document.getElementById(containerId);
  if (!legendContainer) return;
  legendContainer.innerHTML = '';
  labels.forEach((label, index) => {
    const item = document.createElement('div');
    item.className = 'legend-item';
    
    const colorBox = document.createElement('div');
    colorBox.className = 'legend-color-box';
    colorBox.style.backgroundColor = backgroundColors[index % backgroundColors.length];
    
    const textNode = document.createElement('div');
    textNode.className = 'legend-label';
    textNode.title = label;
    textNode.textContent = label;
    
    const valueNode = document.createElement('div');
    valueNode.className = 'legend-value';
    const percentage = ((data[index] / data.reduce((a, b) => a + b, 0)) * 100).toFixed(2);
    valueNode.textContent = percentage + '%';

    item.appendChild(colorBox);
    item.appendChild(textNode);
    item.appendChild(valueNode);
    
    item.addEventListener('click', () => {
      const meta = chartInstance.getDatasetMeta(0);
      const isHidden = meta.data[index].hidden;
      meta.data[index].hidden = !isHidden;
      item.classList.toggle('hidden', !isHidden);
      chartInstance.update();
    });
    
    item.addEventListener('mouseenter', () => {
      chartInstance.setActiveElements([{ datasetIndex: 0, index: index }]);
      chartInstance.tooltip.setActiveElements([{ datasetIndex: 0, index: index }]);
      chartInstance.update();
    });
    
    item.addEventListener('mouseleave', () => {
      chartInstance.setActiveElements([]);
      chartInstance.tooltip.setActiveElements([]);
      chartInstance.update();
    });

    legendContainer.appendChild(item);
  });

  // Init Word Cloud Chart
  const wordCloudCtx = document.getElementById('wordCloudChart');
  if (wordCloudCtx && allSchemes.length > 0) {
    const stopWords = new Set(["the", "and", "of", "to", "in", "for", "a", "on", "with", "as", "by", "is", "at", "an", "from", "this", "under", "will", "be", "it", "are", "that", "which", "scheme", "west", "bengal", "state", "government", "has", "been", "have", "their", "all", "its", "other", "any", "not", "new", "through", "provided", "development", "crore", "lakh", "rs", "per", "assistance", "financial", "scheme", "schemes", "initiative", "initiatives", "programme", "programmes", "project", "projects", "department", "departments", "fund", "funds", "budget", "plan", "plans"]);
    const wordCounts = {};

    allSchemes.forEach(s => {
      const text = (s.name + ' ' + s.details).toLowerCase();
      const words = text.match(/\b[a-z]{4,}\b/g) || []; // minimum 4 letters
      words.forEach(w => {
        if (!stopWords.has(w)) {
          wordCounts[w] = (wordCounts[w] || 0) + 1;
        }
      });
    });

    const sortedWords = Object.entries(wordCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 70);

    const maxFreq = Math.max(...sortedWords.map(w => w[1]));
    const labels = sortedWords.map(w => w[0]);
    const data = sortedWords.map(w => {
      // Normalizing frequencies: max font size ~35px, min font size ~10px
      return 10 + (Math.pow(w[1] / maxFreq, 0.6) * 35);
    });

    if (wordCloudChartInstance) wordCloudChartInstance.destroy();

    wordCloudChartInstance = new Chart(wordCloudCtx, {
      type: 'wordCloud',
      data: {
        labels: labels,
        datasets: [{
          label: 'Weight',
          data: data,
          color: (ctx) => {
            const index = ctx.dataIndex;
            const rank = index / data.length;
            if (rank < 0.1) return '#f28500'; // primary saffron
            if (rank < 0.3) return '#ff9933'; // lighter saffron
            if (rank < 0.6) return document.documentElement.getAttribute('data-theme') === 'dark' ? '#9ca3af' : '#4b5563'; // secondary
            return document.documentElement.getAttribute('data-theme') === 'dark' ? '#4b5563' : '#9ca3af'; // tertiary
          }
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        layout: {
          padding: 30
        },
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (context) => `Frequency weight: ${Math.round(context.raw)}`
            }
          }
        }
      }
    });
  }
}

const originalUpdate = Chart.prototype.update;
Chart.prototype.update = function(mode) {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const textColor = isDark ? '#e6edf3' : '#4b5563';
  const gridColor = isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)';
  const borderColor = isDark ? '#161b22' : '#ffffff';
  
  if (this.options.scales && this.options.scales.y) {
    this.options.scales.y.grid.color = gridColor;
    this.options.scales.y.ticks.color = textColor;
  }
  if (this.options.scales && this.options.scales.x) {
    this.options.scales.x.ticks.color = textColor;
  }
  
  if (this.config.type === 'doughnut' || this.config.type === 'pie') {
    this.data.datasets[0].borderColor = borderColor;
  }
  
  if (this.options.plugins && this.options.plugins.legend && this.options.plugins.legend.labels) {
    this.options.plugins.legend.labels.color = textColor;
  }

  originalUpdate.call(this, mode);
};

// Back to top logic
const backToTopBtn = document.getElementById('back-to-top');
if (backToTopBtn) {
  window.addEventListener('scroll', () => {
    if (window.scrollY > 500) {
      backToTopBtn.classList.add('visible');
    } else {
      backToTopBtn.classList.remove('visible');
    }
  });

  backToTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

document.addEventListener('DOMContentLoaded', init);
