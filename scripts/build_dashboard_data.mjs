import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { lakhRupeesToThousand, normaliseTag, parseLegacyOutlay, slugify, stableId } from './lib/budget-utils.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'budget-frontend', 'public');
const legacy = JSON.parse(fs.readFileSync(path.join(publicDir, 'data.json'), 'utf8'));
const charts = JSON.parse(fs.readFileSync(path.join(publicDir, 'charts_data.json'), 'utf8'));
const registry = JSON.parse(fs.readFileSync(path.join(root, 'data', 'source-registry.json'), 'utf8'));
const overrides = JSON.parse(fs.readFileSync(path.join(root, 'data', 'reconciliation-overrides.json'), 'utf8'));
const extractedPath = path.join(root, 'data', 'extracted', 'bp3-budget-lines.json');
const extracted = fs.existsSync(extractedPath) ? JSON.parse(fs.readFileSync(extractedPath, 'utf8')) : { rows: [] };

const DEPARTMENT_ALIASES = {
  'Agriculture Department': 'Agriculture',
  'Animal Resources Development': 'Animal Resources Development',
  'Backward Classes Welfare & Tribal Development': 'Backward Classes Welfare',
  'Co-operation Department': 'Cooperation',
  'Consumer Affairs': 'Consumer Affairs',
  'Disaster Management and Civil Defence Department': 'Disaster Management and Civil Defence',
  'Education (School & Higher)': 'Higher Education',
  'Environment Department': 'Environment',
  'Excise Department': 'Finance',
  'Finance Department': 'Finance',
  'Fisheries Department': 'Fisheries',
  'Food Processing Industries and Horticulture': 'Food Processing Industries and Horticulture',
  'Health & Family Welfare / AYUSH': 'Health & Family Welfare',
  'Home & Hill Affairs Department': 'Home and Hill Affairs',
  'Industry, Commerce and Enterprises / Mines': 'Industry Commerce and Enterprises',
  'Information & Cultural Affairs': 'Information & Cultural Affairs',
  'Information Technology and Electronics Department': 'Information Technology & Electronics',
  'Irrigation & Waterways / Public Health Engineering': 'Irrigation & Waterways',
  'Labour & Employment / Urban Development': 'Labour',
  'Land & Land Reforms Department': 'Land & Land Reforms and Refugee Relief & Rehabilitation',
  'Law / Judiciary / Correctional Services': 'Judicial',
  'Micro, Small & Medium Enterprises and Textiles': 'Micro, Small & Medium Enterprises and Textiles',
  'Minority Affairs / Madrasah Education': 'Minority Affairs & Madrasah Education',
  'North Bengal Development Department': 'North Bengal Development',
  'Panchayat & Rural Development': 'Panchayats & Rural Development',
  'Parliamentary Affairs Department': 'Parliamentary Affairs',
  'Paschimanchal Unnayan Affairs': 'Paschimanchal Unnayan Affairs',
  'Personnel and Administrative Reforms': 'Personnel & Administrative Reforms',
  'Planning & Statistics Department / Programme Monitoring': 'Planning & Statistics',
  'Power & Non-Conventional Energy': 'Power',
  'Public Works Department (PWD) / Transport Infrastructure': 'Public Works',
  'School & Mass Education': 'School Education',
  'Science, Technology and Bio-Technology Department': 'Science & Technology and Bio-Technology',
  'Self Help Group and Self Employment': 'Self-Help Group & Self-Employment',
  'Technical Education, Training & Skill Development': 'Technical Education, Training & Skill Development',
  'Tourism Department': 'Tourism',
  'Transport Department': 'Transport',
  'Tribal Development Department': 'Tribal Development',
  'Urban Development & Municipal Affairs': 'Urban Development and Municipal Affairs',
  'Women & Child Development and Social Welfare': 'Women & Child Development and Social Welfare',
  'Youth Services & Sports': 'Youth Services and Sports',
  'Multiple Departments / Uncategorized': 'Programme Monitoring'
};

const overrideMap = new Map(overrides.matches.map(item => [item.legacyKey, item]));
const canonicalNames = Object.keys(charts.department_outlays);
const departments = canonicalNames.map((name, index) => ({
  id: `dept-${slugify(name)}`,
  demandOrder: index + 1,
  name,
  aliases: Object.entries(DEPARTMENT_ALIASES).filter(([, target]) => target === name).map(([alias]) => alias),
  amount2026Thousand: lakhRupeesToThousand(charts.department_outlays[name]),
  source: { sourceId: 'bp-3', page: null },
  schemeCount: 0,
  themes: []
}));
const departmentByName = new Map(departments.map(item => [item.name, item]));

const boilerplatePrefix = 'Comprehensive strategic initiative and dedicated financial provision aimed at';
const schemes = [];
const legacySchemeIds = new Set();
for (const legacyDepartment of legacy.departments) {
  if (!legacyDepartment.schemes?.length) continue;
  const canonicalName = DEPARTMENT_ALIASES[legacyDepartment.name] || legacyDepartment.name;
  const department = departmentByName.get(canonicalName) || departmentByName.get('Programme Monitoring');
  legacyDepartment.schemes.forEach((item, index) => {
    const legacyKey = `${legacyDepartment.name}|${item.name}|${index}`;
    const reviewed = overrideMap.get(legacyKey);
    const outlay = parseLegacyOutlay(item.outlay);
    const hasBoilerplate = String(item.details || '').startsWith(boilerplatePrefix);
    const themes = [...new Set((item.tags || []).map(normaliseTag))].sort();
    const locations = (item.locations || []).map(location => ({
      name: location.name,
      latitude: Number(location.lat),
      longitude: Number(location.lng),
      precision: 'approximate',
      sourceId: 'legacy-geocoding'
    }));
    const classification = reviewed?.classification || (hasBoilerplate ? 'unmatched' : 'speech_announcement');
    const legacyRecord = {
      id: stableId('scheme', legacyDepartment.name, item.name, index),
      title: item.name,
      departmentId: department.id,
      departmentName: department.name,
      relatedDepartmentIds: [],
      legacyDepartment: legacyDepartment.name,
      summary: hasBoilerplate ? 'A source-grounded description for this catalogue entry has not yet been verified.' : item.details,
      themes,
      fundingType: reviewed?.fundingType || 'not_classified',
      classification,
      matchStatus: reviewed ? 'reviewed' : 'unmatched',
      amountStatus: outlay.status,
      announcedAmountThousand: outlay.announcedAmountThousand,
      announcedOutlayNote: outlay.displayNote,
      financials: { actual2024Thousand: null, budget2025Thousand: null, revised2025Thousand: null, budget2026Thousand: reviewed?.budget2026Thousand || null },
      budgetCode: reviewed?.budgetCode || null,
      centralShareThousand: reviewed?.centralShareThousand || null,
      stateShareThousand: reviewed?.stateShareThousand || null,
      sources: reviewed?.sources || [],
      locations
    };
    schemes.push(legacyRecord);
    legacySchemeIds.add(legacyRecord.id);
    department.schemeCount += 1;
    department.themes.push(...themes);
  });
}

const officialDepartmentAliases = {
  'Agricultural Marketing': 'Agricultural Marketing',
  "Chief Minister's Office": "Chief Minister's Office",
  'Council of Ministers [Home (C & E)]': 'Council of Ministers',
  "Governor's Secretariat": "Governor's Secretariat",
  'Legislative Assembly Secretariat': 'Legislative Assembly Secretariat'
};
const canonicalOfficialDepartment = raw => {
  const stripped = raw.replace(/ Department$/, '');
  return officialDepartmentAliases[stripped] || stripped;
};
const normaliseTitle = value => value.toLowerCase().replace(/\{[^}]+\}/g, '').replace(/\([^)]*(?:share|sna|sparsh|css|central|state)[^)]*\)/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const officialGroups = new Map();
for (const row of extracted.rows) {
  const canonicalName = canonicalOfficialDepartment(row.departmentName);
  if (!departmentByName.has(canonicalName)) continue;
  const key = `${canonicalName}|${normaliseTitle(row.title)}`;
  if (!officialGroups.has(key)) officialGroups.set(key, []);
  officialGroups.get(key).push(row);
}
const consumedOfficialCodes = new Set();
const legacyGroupCounts = new Map();
for (const item of schemes) {
  const key = `${item.departmentName}|${normaliseTitle(item.title)}`;
  legacyGroupCounts.set(key, (legacyGroupCounts.get(key) || 0) + 1);
}
for (const item of schemes) {
  const key = `${item.departmentName}|${normaliseTitle(item.title)}`;
  const candidates = officialGroups.get(key) || [];
  if (candidates.length !== 1 || legacyGroupCounts.get(key) !== 1 || item.matchStatus === 'reviewed') continue;
  const row = candidates[0];
  item.classification = 'official_budget_line';
  item.matchStatus = 'reviewed';
  item.amountStatus = row.amountStatus;
  item.financials = row.financials;
  item.budgetCode = row.budgetCode;
  item.fundingType = row.fundingType;
  item.sources = [row.source];
  consumedOfficialCodes.add(`${row.departmentCode}|${row.budgetCode}`);
}
for (const row of extracted.rows) {
  const canonicalName = canonicalOfficialDepartment(row.departmentName);
  const department = departmentByName.get(canonicalName);
  if (!department || consumedOfficialCodes.has(`${row.departmentCode}|${row.budgetCode}`)) continue;
  schemes.push({
    id: stableId('line', row.departmentCode, row.budgetCode),
    title: row.title,
    departmentId: department.id,
    departmentName: department.name,
    relatedDepartmentIds: [],
    legacyDepartment: null,
    summary: `Official BP-3 budget line published for ${department.name}.`,
    themes: [],
    fundingType: row.fundingType,
    classification: 'official_budget_line',
    matchStatus: 'reviewed',
    amountStatus: row.amountStatus,
    announcedAmountThousand: null,
    announcedOutlayNote: '',
    financials: row.financials,
    budgetCode: row.budgetCode,
    centralShareThousand: null,
    stateShareThousand: null,
    sources: [row.source],
    locations: []
  });
}

departments.forEach(department => {
  const associated = schemes.filter(item => item.departmentId === department.id);
  department.schemeCount = associated.length;
  department.themes = [...new Set(associated.flatMap(item => item.themes))].sort();
});

const receipts = [
  ...Object.entries(charts.revenue_sources).map(([name, crore]) => ({ id: slugify(name), name, crore, kind: name.includes('Debt') || name.includes('Recoveries') ? 'capital' : 'revenue' }))
];
const revenueReceiptsCrore = receipts.filter(item => item.kind === 'revenue').reduce((sum, item) => sum + item.crore, 0);
const capitalReceiptsCrore = receipts.filter(item => item.kind === 'capital').reduce((sum, item) => sum + item.crore, 0);
const publishedWithAnnouncedOutlay = schemes.filter(item => item.announcedAmountThousand != null).length;
const sourceGroundedDescriptions = schemes.filter(item => !item.summary.startsWith('A source-grounded')).length;
const officialBudgetRows = schemes.filter(item => item.classification === 'official_budget_line').length;
const reconciledLegacyEntries = schemes.filter(item => legacySchemeIds.has(item.id) && item.matchStatus === 'reviewed').length;

const metadata = {
  schemaVersion: 1,
  financialYear: '2026-27',
  updatedAt: '2026-08-02',
  publicationStatus: 'Reconciled legacy catalogue; BP-3 row-level review in progress',
  totals: {
    departments: departments.length,
    catalogueEntries: schemes.length,
    legacyCatalogueEntries: legacySchemeIds.size,
    officialBudgetRows,
    reconciledLegacyEntries,
    officialMatchedEntries: schemes.filter(item => item.matchStatus === 'reviewed').length,
    entriesWithAnnouncedOutlay: publishedWithAnnouncedOutlay,
    sourceGroundedDescriptions,
    mappedEntries: schemes.filter(item => item.locations.length).length,
    revenueReceiptsCrore,
    capitalReceiptsCrore,
    totalReceiptsCrore: charts.total_revenue,
    totalExpenditureCrore: charts.total_expenditure,
    sdgAllocationCrore: legacy.sdgs.reduce((sum, item) => sum + item.allocation_crore, 0)
  },
  receipts,
  expenditure: Object.entries(charts.expenditure_breakdown).map(([name, crore]) => ({ id: slugify(name), name, crore })),
  sdgs: legacy.sdgs,
  sources: registry.sources,
  definitions: {
    allocation: 'An amount provided in the budget estimate; it is not the same as actual spending or a fund release.',
    announcedOutlay: 'An amount stated in an announcement or legacy source that has not yet been reconciled to a BP-3 budget line.',
    tokenProvision: 'A nominal provision used to keep a budget head open.',
    unmatched: 'The catalogue entry has not yet been linked to an exact official budget row.'
  }
};

const mapData = schemes.filter(item => item.locations.length).map(item => ({
  schemeId: item.id,
  title: item.title,
  departmentName: item.departmentName,
  amountStatus: item.amountStatus,
  announcedAmountThousand: item.announcedAmountThousand,
  locations: item.locations
}));

for (const [filename, data] of Object.entries({ 'metadata.json': metadata, 'departments.json': departments, 'schemes.json': schemes, 'map-data.json': mapData })) {
  fs.writeFileSync(path.join(publicDir, filename), `${JSON.stringify(data, null, 2)}\n`);
}

const report = `# Dashboard data quality report\n\nGenerated: ${metadata.updatedAt}\n\n- Canonical departments: ${departments.length}\n- Legacy catalogue entries retained: ${legacySchemeIds.size}\n- Extracted BP-3 budget rows published: ${officialBudgetRows}\n- Legacy entries reconciled by unique exact title: ${reconciledLegacyEntries}\n- Total explorer records: ${schemes.length}\n- Entries with legacy announced outlays: ${publishedWithAnnouncedOutlay}\n- Source-grounded descriptions: ${sourceGroundedDescriptions}\n- Entries with mapped locations: ${metadata.totals.mappedEntries}\n- Unmatched entries: ${schemes.filter(item => item.matchStatus === 'unmatched').length}\n\n## Interpretation\n\nThe generated interface distinguishes legacy announced outlays from verified BP-3 budget estimates. Empty BP-3 financial fields are intentionally displayed as not yet reconciled, never as zero.\n`;
fs.writeFileSync(path.join(root, 'data', 'DATA_QUALITY.md'), report);

console.log(`Generated dashboard data for ${departments.length} departments and ${schemes.length} catalogue entries.`);
