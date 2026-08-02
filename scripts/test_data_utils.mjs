import assert from 'node:assert/strict';
import { croreToThousand, lakhRupeesToThousand, normaliseTag, parseLegacyOutlay, thousandToCrore } from './lib/budget-utils.mjs';

assert.equal(lakhRupeesToThousand(856584.3), 85658430);
assert.equal(thousandToCrore(85658430), 8565.843);
assert.equal(croreToThousand(18.5), 185000);
assert.deepEqual(parseLegacyOutlay('₹18.50 crore'), { status: 'stated', announcedAmountThousand: 185000, displayNote: '₹18.50 crore' });
assert.equal(parseLegacyOutlay('').status, 'unmatched');
assert.equal(parseLegacyOutlay('Amount not stated').status, 'not_stated');
assert.equal(normaliseTag('IT & Tech'), 'Digital & Technology');
assert.equal(normaliseTag('Law And Order'), 'Law & Order');
console.log('Budget utility tests passed.');
