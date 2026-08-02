import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  aggregateFinancials,
  amountStatusForFinancials,
  budgetTitleSimilarity,
  lakhRupeesToThousand,
  normaliseBudgetAliasTitle,
  normaliseBudgetTitle,
  normaliseTag,
  parseLegacyOutlay,
  slugify,
  stableId
} from './lib/budget-utils.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'budget-frontend', 'public');
const legacy = JSON.parse(fs.readFileSync(path.join(publicDir, 'data.json'), 'utf8'));
const charts = JSON.parse(fs.readFileSync(path.join(publicDir, 'charts_data.json'), 'utf8'));
const registry = JSON.parse(fs.readFileSync(path.join(root, 'data', 'source-registry.json'), 'utf8'));
const overrides = JSON.parse(fs.readFileSync(path.join(root, 'data', 'reconciliation-overrides.json'), 'utf8'));
const extracted = JSON.parse(fs.readFileSync(path.join(root, 'data', 'extracted', 'bp3-budget-lines.json'), 'utf8'));

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

const OFFICIAL_DEPARTMENT_ALIASES = {
  'Agricultural Marketing': 'Agricultural Marketing',
  "Chief Minister's Office": "Chief Minister's Office",
  'Council of Ministers [Home (C & E)]': 'Council of Ministers',
  "Governor's Secretariat": "Governor's Secretariat",
  'Legislative Assembly Secretariat': 'Legislative Assembly Secretariat'
};

const canonicalOfficialDepartment = raw => {
  const stripped = raw.replace(/ Department$/, '');
  return OFFICIAL_DEPARTMENT_ALIASES[stripped] || stripped;
};
const groupKey = (departmentName, title) => `${departmentName}|${normaliseBudgetTitle(title)}`;
const legacyKey = (departmentName, title) => `${departmentName}|${title}`;
const rowId = row => stableId('line', row.departmentCode, row.budgetCode);
const uniqueSources = sources => [...new Map(sources.map(source => [`${source.sourceId}|${source.page || ''}`, source])).values()];
const boilerplatePrefix = 'Comprehensive strategic initiative and dedicated financial provision aimed at';

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

const officialGroups = new Map();
const officialAliasGroups = new Map();
const officialRowsByDepartmentAndCode = new Map();
for (const row of extracted.rows) {
  const canonicalName = canonicalOfficialDepartment(row.departmentName);
  if (!departmentByName.has(canonicalName)) continue;
  const key = groupKey(canonicalName, row.title);
  if (!officialGroups.has(key)) officialGroups.set(key, []);
  officialGroups.get(key).push(row);
  const aliasKey = `${canonicalName}|${normaliseBudgetAliasTitle(row.title)}`;
  if (!officialAliasGroups.has(aliasKey)) officialAliasGroups.set(aliasKey, []);
  officialAliasGroups.get(aliasKey).push(row);
  officialRowsByDepartmentAndCode.set(`${canonicalName}|${row.budgetCode}`, row);
}
const officialGroupsByDepartment = new Map();
for (const [key, rows] of officialGroups) {
  const departmentName = key.slice(0, key.indexOf('|'));
  if (!officialGroupsByDepartment.has(departmentName)) officialGroupsByDepartment.set(departmentName, []);
  officialGroupsByDepartment.get(departmentName).push(rows);
}

const overrideMap = new Map(overrides.matches.map(item => [legacyKey(item.legacyDepartment, item.legacyTitle), item]));
const schemes = [];
const legacyRecords = [];

function candidateGroupsFor(item) {
  const ranked = (officialGroupsByDepartment.get(item.departmentName) || []).map(rows => ({
    rows,
    score: budgetTitleSimilarity(item.title, rows[0].title)
  })).sort((left, right) => right.score - left.score);
  const margin = (ranked[0]?.score || 0) - (ranked[1]?.score || 0);
  if (!ranked[0] || ranked[0].score < 0.72 || margin < 0.12) return [];
  return ranked.slice(0, 3).filter(candidate => candidate.score >= 0.6).map(candidate => ({
    title: candidate.rows[0].title,
    score: Number(candidate.score.toFixed(3)),
    budgetCodes: candidate.rows.map(row => row.budgetCode),
    budget2026Thousand: aggregateFinancials(candidate.rows).budget2026Thousand,
    sources: uniqueSources(candidate.rows.map(row => row.source))
  }));
}

function applyReviewedReconciliation(item, rows, status, options = {}) {
  const financials = aggregateFinancials(rows);
  item.classification = options.classification || (rows.length === 1 ? 'official_budget_line' : 'aggregated_programme');
  item.matchStatus = 'reviewed';
  item.reconciliationStatus = status;
  item.amountStatus = amountStatusForFinancials(financials, item.amountStatus);
  item.financials = financials;
  item.budgetCode = rows.length === 1 ? rows[0].budgetCode : null;
  item.budgetCodes = rows.map(row => row.budgetCode);
  item.officialBudgetLineIds = rows.map(rowId);
  item.sources = uniqueSources([
    ...rows.map(row => row.source),
    ...(options.additionalSources || [])
  ]);
  item.reconciliation = {
    status,
    method: options.method || (rows.length === 1 ? 'exact_title' : 'grouped_exact_title'),
    reviewedAt: options.reviewedAt || '2026-08-03',
    note: options.note || (rows.length === 1
      ? 'This legacy initiative is linked to one exact-title BP-3 budget row.'
      : `This legacy initiative is linked to ${rows.length} exact-title BP-3 rows and the four financial periods are summed across those heads.`),
    includedBudgetCodes: item.budgetCodes,
    rollupSafe: options.rollupSafe ?? true,
    overlapsWith: []
  };
}

for (const legacyDepartment of legacy.departments) {
  if (!legacyDepartment.schemes?.length) continue;
  const canonicalName = DEPARTMENT_ALIASES[legacyDepartment.name] || legacyDepartment.name;
  const department = departmentByName.get(canonicalName) || departmentByName.get('Programme Monitoring');
  legacyDepartment.schemes.forEach((sourceItem, index) => {
    const outlay = parseLegacyOutlay(sourceItem.outlay);
    const hasBoilerplate = String(sourceItem.details || '').startsWith(boilerplatePrefix);
    const themes = [...new Set((sourceItem.tags || []).map(normaliseTag))].sort();
    const item = {
      id: stableId('scheme', legacyDepartment.name, sourceItem.name, index),
      recordKind: 'legacy_initiative',
      title: sourceItem.name,
      departmentId: department.id,
      departmentName: department.name,
      relatedDepartmentIds: [],
      relatedInitiativeIds: [],
      legacyDepartment: legacyDepartment.name,
      summary: hasBoilerplate ? 'A source-grounded description for this catalogue entry has not yet been verified.' : sourceItem.details,
      themes,
      fundingType: 'not_classified',
      classification: hasBoilerplate ? 'unmatched' : 'speech_announcement',
      matchStatus: 'unmatched',
      reconciliationStatus: 'unmatched',
      amountStatus: outlay.status,
      announcedAmountThousand: outlay.announcedAmountThousand,
      announcedOutlayNote: outlay.displayNote,
      financials: { actual2024Thousand: null, budget2025Thousand: null, revised2025Thousand: null, budget2026Thousand: null },
      budgetCode: null,
      budgetCodes: [],
      officialBudgetLineIds: [],
      centralShareThousand: null,
      stateShareThousand: null,
      sources: [],
      locations: (sourceItem.locations || []).map(location => ({
        name: location.name,
        latitude: Number(location.lat),
        longitude: Number(location.lng),
        precision: 'approximate',
        sourceId: 'legacy-geocoding'
      })),
      reconciliation: {
        status: 'unmatched',
        method: 'none',
        reviewedAt: null,
        note: 'No exact or manually reviewed BP-3 relationship has been established.',
        includedBudgetCodes: [],
        rollupSafe: false,
        overlapsWith: [],
        candidates: []
      }
    };

    const reviewed = overrideMap.get(legacyKey(legacyDepartment.name, sourceItem.name));
    if (reviewed) {
      const rows = reviewed.budgetCodes.map(code => officialRowsByDepartmentAndCode.get(`${department.name}|${code}`)).filter(Boolean);
      const additionalSources = (reviewed.sources || []).flatMap(source => source.pages
        ? source.pages.map(page => ({ sourceId: source.sourceId, page }))
        : [{ sourceId: source.sourceId, page: source.page || null }]);
      applyReviewedReconciliation(item, rows, 'verified_aggregate', {
        classification: reviewed.classification,
        method: reviewed.relationship,
        note: reviewed.note,
        reviewedAt: overrides.reviewedAt,
        rollupSafe: reviewed.rollupSafe,
        additionalSources
      });
      item.pendingRelatedLegacyTitles = reviewed.relatedLegacyTitles || [];
    } else {
      const exactRows = officialGroups.get(groupKey(department.name, sourceItem.name)) || [];
      if (exactRows.length) {
        applyReviewedReconciliation(item, exactRows, exactRows.length === 1 ? 'exact' : 'grouped_exact');
      } else {
        const aliasRows = officialAliasGroups.get(`${department.name}|${normaliseBudgetAliasTitle(sourceItem.name)}`) || [];
        if (aliasRows.length) {
          applyReviewedReconciliation(item, aliasRows, 'exact_alias', {
            method: 'deterministic_title_alias',
            note: `This deterministic alias match ignores presentation-only prefixes and acronyms, then links ${aliasRows.length} BP-3 ${aliasRows.length === 1 ? 'row' : 'rows'}.`
          });
        } else {
          const candidates = candidateGroupsFor(item);
          if (candidates.length) {
            item.matchStatus = 'candidate';
            item.reconciliationStatus = 'candidate';
            item.reconciliation = {
              ...item.reconciliation,
              status: 'candidate',
              method: 'same_department_title_similarity',
              note: 'One or more same-department title candidates were found. They remain unverified and are not used as official allocations.',
              candidates
            };
          }
        }
      }
    }

    schemes.push(item);
    legacyRecords.push(item);
  });
}

const legacyByDepartmentAndTitle = new Map(legacyRecords.map(item => [legacyKey(item.legacyDepartment, item.title), item]));
for (const item of legacyRecords) {
  item.relatedInitiativeIds = (item.pendingRelatedLegacyTitles || []).map(title => legacyByDepartmentAndTitle.get(legacyKey(item.legacyDepartment, title))?.id).filter(Boolean);
  delete item.pendingRelatedLegacyTitles;
}

const codeUsers = new Map();
for (const item of legacyRecords.filter(record => record.matchStatus === 'reviewed')) {
  for (const code of item.budgetCodes) {
    if (!codeUsers.has(code)) codeUsers.set(code, []);
    codeUsers.get(code).push(item.id);
  }
}
for (const item of legacyRecords.filter(record => record.matchStatus === 'reviewed')) {
  const overlaps = [...new Set(item.budgetCodes.flatMap(code => codeUsers.get(code) || []).filter(id => id !== item.id))];
  item.reconciliation.overlapsWith = overlaps;
  if (overlaps.length) item.reconciliation.rollupSafe = false;
}

for (const row of extracted.rows) {
  const canonicalName = canonicalOfficialDepartment(row.departmentName);
  const department = departmentByName.get(canonicalName);
  if (!department) continue;
  const id = rowId(row);
  schemes.push({
    id,
    recordKind: 'official_budget_line',
    title: row.title,
    departmentId: department.id,
    departmentName: department.name,
    relatedDepartmentIds: [],
    relatedInitiativeIds: codeUsers.get(row.budgetCode) || [],
    legacyDepartment: null,
    summary: `Official BP-3 budget line published for ${department.name}.`,
    themes: [],
    fundingType: row.fundingType,
    classification: 'official_budget_line',
    matchStatus: 'reviewed',
    reconciliationStatus: 'official_row',
    amountStatus: row.amountStatus,
    announcedAmountThousand: null,
    announcedOutlayNote: '',
    financials: row.financials,
    budgetCode: row.budgetCode,
    budgetCodes: [row.budgetCode],
    officialBudgetLineIds: [id],
    centralShareThousand: null,
    stateShareThousand: null,
    sources: [row.source],
    locations: [],
    reconciliation: {
      status: 'official_row',
      method: 'bp3_extraction',
      reviewedAt: '2026-08-02',
      note: 'This is a directly extracted official BP-3 budget row, not a reconciled announcement.',
      includedBudgetCodes: [row.budgetCode],
      rollupSafe: true,
      overlapsWith: codeUsers.get(row.budgetCode) || []
    }
  });
}

departments.forEach(department => {
  const associated = schemes.filter(item => item.departmentId === department.id);
  department.schemeCount = associated.length;
  department.themes = [...new Set(associated.flatMap(item => item.themes))].sort();
});

const receipts = Object.entries(charts.revenue_sources).map(([name, crore]) => ({
  id: slugify(name),
  name,
  crore,
  kind: name.includes('Debt') || name.includes('Recoveries') ? 'capital' : 'revenue'
}));
const revenueReceiptsCrore = receipts.filter(item => item.kind === 'revenue').reduce((sum, item) => sum + item.crore, 0);
const capitalReceiptsCrore = receipts.filter(item => item.kind === 'capital').reduce((sum, item) => sum + item.crore, 0);
const reconciliationBreakdown = Object.fromEntries(['exact', 'exact_alias', 'grouped_exact', 'verified_aggregate', 'candidate', 'unmatched'].map(status => [status, legacyRecords.filter(item => item.reconciliationStatus === status).length]));
const reviewedLegacy = legacyRecords.filter(item => item.matchStatus === 'reviewed');

const metadata = {
  schemaVersion: 2,
  financialYear: '2026-27',
  updatedAt: '2026-08-03',
  publicationStatus: 'BP-3 rows published; exact, grouped, aggregate, candidate, and unmatched relationships distinguished',
  totals: {
    departments: departments.length,
    catalogueEntries: schemes.length,
    legacyCatalogueEntries: legacyRecords.length,
    officialBudgetRows: extracted.rows.length,
    reconciledLegacyEntries: reviewedLegacy.length,
    reconciliationCandidates: reconciliationBreakdown.candidate,
    reconciliationBreakdown,
    entriesWithAnnouncedOutlay: legacyRecords.filter(item => item.announcedAmountThousand != null).length,
    sourceGroundedDescriptions: schemes.filter(item => !item.summary.startsWith('A source-grounded')).length,
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
    announcedOutlay: 'An amount stated in an announcement or legacy source. When reconciled, the official BP-3 derivation is shown alongside it.',
    groupedExact: 'An exact-title initiative represented by more than one BP-3 head; financial periods are summed across the cited heads.',
    exactAlias: 'A deterministic title alias that differs only by presentation prefixes, acronyms, or source codes.',
    verifiedAggregate: 'A manually reviewed relationship that combines differently titled BP-3 lines. Included codes and overlap warnings are published.',
    candidate: 'A same-department title similarity was found but has not been approved and is not presented as an official allocation.',
    tokenProvision: 'A nominal provision used to keep a budget head open.',
    unmatched: 'No reviewed relationship to an official budget row has been established.'
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

const report = `# Dashboard data quality report\n\nGenerated: ${metadata.updatedAt}\n\n- Canonical departments: ${departments.length}\n- Legacy catalogue entries retained: ${legacyRecords.length}\n- Extracted BP-3 budget rows published: ${extracted.rows.length}\n- Exact one-row matches: ${reconciliationBreakdown.exact}\n- Deterministic title aliases: ${reconciliationBreakdown.exact_alias}\n- Exact grouped matches: ${reconciliationBreakdown.grouped_exact}\n- Reviewed cross-title aggregates: ${reconciliationBreakdown.verified_aggregate}\n- Review candidates: ${reconciliationBreakdown.candidate}\n- Unmatched legacy entries: ${reconciliationBreakdown.unmatched}\n- Total explorer records: ${schemes.length}\n\n## Interpretation\n\nOfficial BP-3 rows remain independently searchable. Reconciled legacy initiatives link to those rows and may aggregate them, but overlapping initiatives are marked as unsafe to sum. Candidate matches never populate official financial fields until reviewed.\n`;
fs.writeFileSync(path.join(root, 'data', 'DATA_QUALITY.md'), report);

const candidateRows = legacyRecords.filter(item => item.reconciliationStatus === 'candidate').sort((left, right) => left.departmentName.localeCompare(right.departmentName) || left.title.localeCompare(right.title));
const candidateReport = `# Reconciliation review queue\n\nGenerated: ${metadata.updatedAt}\n\nThese similarities are leads, not approved allocations. Review the cited BP-3 rows before adding an override.\n\n| Department | Legacy initiative | Best candidate | Confidence | Budget codes |\n|---|---|---|---:|---|\n${candidateRows.map(item => {
  const candidate = item.reconciliation.candidates[0];
  const clean = value => String(value).replace(/\|/g, '\\|');
  return `| ${clean(item.departmentName)} | ${clean(item.title)} | ${clean(candidate.title)} | ${Math.round(candidate.score * 100)}% | ${candidate.budgetCodes.join(', ')} |`;
}).join('\n')}\n`;
fs.writeFileSync(path.join(root, 'data', 'RECONCILIATION_CANDIDATES.md'), candidateReport);

console.log(`Generated ${schemes.length} records: ${reviewedLegacy.length} reviewed legacy relationships, ${reconciliationBreakdown.candidate} candidates, and ${extracted.rows.length} official BP-3 rows.`);
