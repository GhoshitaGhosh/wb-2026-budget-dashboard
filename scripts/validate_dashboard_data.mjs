import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir = path.join(root, 'budget-frontend', 'public');
const metadata = JSON.parse(fs.readFileSync(path.join(publicDir, 'metadata.json'), 'utf8'));
const departments = JSON.parse(fs.readFileSync(path.join(publicDir, 'departments.json'), 'utf8'));
const schemes = JSON.parse(fs.readFileSync(path.join(publicDir, 'schemes.json'), 'utf8'));
const extracted = JSON.parse(fs.readFileSync(path.join(root, 'data', 'extracted', 'bp3-budget-lines.json'), 'utf8'));
const errors = [];
const unique = values => new Set(values).size === values.length;

if (metadata.schemaVersion !== 2) errors.push('Unexpected metadata schema version.');
if (departments.length !== 58) errors.push(`Expected 58 canonical departments; found ${departments.length}.`);
if (!unique(departments.map(item => item.id))) errors.push('Department IDs are not unique.');
if (!unique(schemes.map(item => item.id))) errors.push('Scheme IDs are not unique.');
if (schemes.some(item => !departments.some(department => department.id === item.departmentId))) errors.push('A scheme references an unknown department.');
if (departments.some(item => !Number.isInteger(item.amount2026Thousand))) errors.push('Department amounts must be integer thousand-rupee values.');
if (schemes.some(item => item.financials.budget2026Thousand != null && !item.sources.length)) errors.push('A verified BP-3 amount is missing a source locator.');
if (metadata.totals.officialBudgetRows !== extracted.rows.length) errors.push('Published official-row count does not reconcile to the BP-3 extraction.');
if (schemes.filter(item => item.recordKind === 'official_budget_line').length !== extracted.rows.length) errors.push('Every extracted BP-3 row must remain independently published.');
if (schemes.some(item => !item.recordKind || !item.reconciliationStatus || !item.reconciliation)) errors.push('A record is missing the version 2 reconciliation contract.');
if (schemes.some(item => item.matchStatus === 'reviewed' && item.recordKind === 'legacy_initiative' && !item.budgetCodes.length)) errors.push('A reviewed legacy initiative has no included budget codes.');
if (schemes.some(item => item.reconciliationStatus === 'candidate' && item.financials.budget2026Thousand != null)) errors.push('An unreviewed candidate must not expose an official allocation.');
if (schemes.some(item => item.reconciliationStatus === 'candidate' && !item.reconciliation.candidates?.length)) errors.push('A candidate record is missing candidate details.');
const annapurna = schemes.find(item => item.recordKind === 'legacy_initiative' && item.title === 'Annapurna Yojana');
const lakshmir = schemes.find(item => item.recordKind === 'legacy_initiative' && item.title === 'Lakshmir Bhandar');
if (annapurna?.reconciliationStatus !== 'verified_aggregate' || annapurna.financials.budget2026Thousand !== 360000000) errors.push('Annapurna aggregate must reconcile to ₹36,000 crore.');
if (annapurna?.budgetCodes.length !== 6 || annapurna?.reconciliation.rollupSafe !== false) errors.push('Annapurna aggregate provenance or overlap warning is incomplete.');
if (lakshmir?.financials.budget2026Thousand !== 204000000 || !annapurna?.relatedInitiativeIds.includes(lakshmir?.id)) errors.push('Lakshmir relationship must reconcile to ₹20,400 crore and link to Annapurna.');
if (metadata.totals.reconciledLegacyEntries !== Object.entries(metadata.totals.reconciliationBreakdown).filter(([status]) => ['exact', 'exact_alias', 'grouped_exact', 'verified_aggregate'].includes(status)).reduce((sum, [, count]) => sum + count, 0)) errors.push('Reconciliation breakdown does not reproduce the reviewed legacy total.');
if (new Set(extracted.rows.map(item => item.departmentName)).size < 57) errors.push('BP-3 extraction covers fewer than 57 department sections.');
if (extracted.rows.some(item => Object.values(item.financials).some(value => value != null && !Number.isInteger(value)))) errors.push('Extracted BP-3 financial values must be integers or null.');
if (extracted.rows.some(item => !item.source?.page || item.source.sourceId !== 'bp-3')) errors.push('An extracted BP-3 row lacks a source page.');
if (departments.find(item => item.name === 'Agriculture')?.amount2026Thousand !== 85658430) errors.push('Department lakh-to-thousand conversion regression detected.');
if (Math.abs(metadata.totals.totalReceiptsCrore - (metadata.totals.revenueReceiptsCrore + metadata.totals.capitalReceiptsCrore)) > 0.02) errors.push('Receipt subtotals do not reconcile.');

if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`Validated ${departments.length} departments and ${schemes.length} catalogue entries.`);
