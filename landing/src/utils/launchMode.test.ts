import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { founderPromoLine, founderPromoPrice } from './founderOffer.ts';
import { isClosedLaunch } from './launchMode.ts';
import { parseWaitlistPlanParam } from './waitlistPlan.ts';

describe('isClosedLaunch', () => {
  it('is closed only for the exact value', () => {
    assert.equal(isClosedLaunch('closed'), true);
    assert.equal(isClosedLaunch(undefined), false);
    assert.equal(isClosedLaunch(''), false);
    assert.equal(isClosedLaunch('open'), false);
  });
});

describe('founder offer prices', () => {
  it('keeps the agreed promotional amounts', () => {
    assert.equal(founderPromoPrice('200'), 'R$ 14,99');
    assert.equal(founderPromoPrice('500'), 'R$ 29,99');
    assert.equal(founderPromoPrice('800'), 'R$ 44,99');
    assert.equal(founderPromoPrice('100'), null);
    assert.equal(founderPromoLine('R$ 14,99'), '3 meses grátis, depois R$ 14,99/mês por 12 meses');
  });
});

describe('parseWaitlistPlanParam', () => {
  it('accepts free plan only when allowed', () => {
    assert.equal(parseWaitlistPlanParam('100'), '100');
    assert.equal(parseWaitlistPlanParam('100', { allowFree: false }), null);
    assert.equal(parseWaitlistPlanParam('500', { allowFree: false }), '500');
    assert.equal(parseWaitlistPlanParam('crescimento'), null);
  });
});
