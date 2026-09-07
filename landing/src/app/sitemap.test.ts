import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { buildSitemapEntries, normalizeSiteUrl } from './sitemap.ts';

describe('normalizeSiteUrl', () => {
  it('strips trailing slashes', () => {
    assert.equal(normalizeSiteUrl('https://flockapp.com.br/'), 'https://flockapp.com.br');
    assert.equal(normalizeSiteUrl('https://flockapp.com.br///'), 'https://flockapp.com.br');
  });
});

describe('buildSitemapEntries', () => {
  it('lists only canonical pages without hashes', () => {
    const entries = buildSitemapEntries('https://flockapp.com.br/');
    const urls = entries.map((entry) => entry.url);

    assert.deepEqual(urls, [
      'https://flockapp.com.br',
      'https://flockapp.com.br/waitlist',
    ]);
    assert.equal(urls.some((url) => url.includes('#')), false);
  });
});
