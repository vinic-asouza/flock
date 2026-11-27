import assert from 'node:assert/strict';
import { describe, it, beforeEach } from 'node:test';
import {
  clearMemberLimitCache,
  getCachedMemberLimit,
  getMemberLimitInflight,
  setCachedMemberLimit,
  setMemberLimitInflight,
  type MemberLimitPayload,
} from './memberLimitCache.ts';

const sample: MemberLimitPayload = {
  currentCount: 10,
  limit: 200,
  remaining: 190,
  hasActiveSubscription: true,
  canAdd: true,
  percentage: 5,
};

describe('memberLimitCache', () => {
  beforeEach(() => {
    clearMemberLimitCache();
  });

  it('stores and returns by church id', () => {
    setCachedMemberLimit('church-a', sample);
    assert.deepEqual(getCachedMemberLimit('church-a'), sample);
    assert.equal(getCachedMemberLimit('church-b'), null);
  });

  it('shares inflight promise for same church', async () => {
    let resolve!: (v: MemberLimitPayload) => void;
    const promise = new Promise<MemberLimitPayload>((r) => {
      resolve = r;
    });
    setMemberLimitInflight('church-a', promise);
    assert.equal(getMemberLimitInflight('church-a'), promise);
    assert.equal(getMemberLimitInflight('other'), null);
    resolve(sample);
    await promise;
  });

  it('clears all state', () => {
    setCachedMemberLimit('church-a', sample);
    clearMemberLimitCache();
    assert.equal(getCachedMemberLimit('church-a'), null);
  });
});
