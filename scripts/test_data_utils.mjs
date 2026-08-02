import assert from 'node:assert/strict';
import { aggregateFinancials, amountStatusForFinancials, budgetTitleSimilarity, croreToThousand, lakhRupeesToThousand, normaliseBudgetAliasTitle, normaliseBudgetTitle, normaliseTag, parseLegacyOutlay, thousandToCrore } from './lib/budget-utils.mjs';

assert.equal(lakhRupeesToThousand(856584.3), 85658430);
assert.equal(thousandToCrore(85658430), 8565.843);
assert.equal(croreToThousand(18.5), 185000);
assert.deepEqual(parseLegacyOutlay('₹18.50 crore'), { status: 'stated', announcedAmountThousand: 185000, displayNote: '₹18.50 crore' });
assert.equal(parseLegacyOutlay('').status, 'unmatched');
assert.equal(parseLegacyOutlay('Amount not stated').status, 'not_stated');
assert.equal(normaliseTag('IT & Tech'), 'Digital & Technology');
assert.equal(normaliseTag('Law And Order'), 'Law & Order');
assert.equal(normaliseBudgetTitle('Lakshmir Bhandar {LAXMI}'), 'lakshmir bhandar');
assert.equal(normaliseBudgetAliasTitle('Implementation of Kanyashree Prakalpa'), 'kanyashree prakalpa');
assert.equal(normaliseBudgetAliasTitle('Bangla Sahayata Kendra (BSK)'), 'bangla sahayata kendra');
assert.ok(budgetTitleSimilarity('Victim Compensation Scheme', 'Compensation Under The Victim Compensation Scheme') > 0.9);
const grouped = aggregateFinancials([
  { financials: { actual2024Thousand: 10, budget2025Thousand: null, revised2025Thousand: 20, budget2026Thousand: 30 } },
  { financials: { actual2024Thousand: -2, budget2025Thousand: null, revised2025Thousand: 5, budget2026Thousand: 70 } }
]);
assert.deepEqual(grouped, { actual2024Thousand: 8, budget2025Thousand: null, revised2025Thousand: 25, budget2026Thousand: 100 });
assert.equal(amountStatusForFinancials(grouped), 'stated');
assert.equal(amountStatusForFinancials({ budget2026Thousand: 0 }), 'zero');
console.log('Budget utility tests passed.');
