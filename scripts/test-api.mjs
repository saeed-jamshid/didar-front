import assert from 'node:assert/strict';
import sharp from 'sharp';
import { fileURLToPath } from 'node:url';
import nextConfig from '../next.config.mjs';
import { hasRemoteMatch } from 'next/dist/shared/lib/match-remote-pattern.js';

const texture = await sharp(fileURLToPath(new URL('../public/card-tree.png', import.meta.url))).metadata();
assert.equal(texture.width, 512);
assert.equal(texture.height, 2212);
assert.equal(texture.hasAlpha, true);
for (const [url, allowed] of [
  ['http://130.185.76.124:8086/media/items/a.jpg', true],
  ['https://didarplace.ir/media/items/a.jpg', true],
  ['http://130.185.76.124:8087/media/items/a.jpg', false],
  ['http://130.185.76.124:8086/api/items/', false],
  ['http://127.0.0.1:8086/media/items/a.jpg', false],
]) assert.equal(hasRemoteMatch([], nextConfig.images.remotePatterns, new URL(url)), allowed);
console.log('Restored texture and scoped preview/production image allowlist passed');

// No network: exercise real client pagination/media normalization on HTTP + HTTPS.
const previous = { window: globalThis.window, fetch: globalThis.fetch, base: process.env.NEXT_PUBLIC_API_URL };
try {
  const scenarios = [
    ['', 'http://130.185.76.124:8086'],
    ['', 'https://didarplace.ir'],
    ['http://127.0.0.1:8000', 'http://localhost:3000'],
  ];
  for (const [index, [base, origin]] of scenarios.entries()) {
    process.env.NEXT_PUBLIC_API_URL = base;
    globalThis.window = { location: { origin } };
    const { fetchItems, fetchCategories } = await import(`../lib/api.ts?scenario=${index}`);
    const canonical = base || 'http://didarplace.ir';
    const image = `${canonical}/media/items/a%20b.jpg`;
    const calls = [];
    globalThis.fetch = async (url) => {
      calls.push(url);
      return { ok: true, json: async () => calls.length === 1
        ? { results: [{ id: 1, image_url: image }], next: `${canonical}/api/items/?page=2` }
        : { results: [{ id: 2, image_url: null }, { id: 3, image_url: '' }], next: null } };
    };
    const items = await fetchItems();
    assert.deepEqual(calls, [`${base}/api/items/`, `${base || origin}/api/items/?page=2`]);
    assert.deepEqual(items.map((item) => item.image_url), [`${base || origin}/media/items/a%20b.jpg`, null, '']);
    globalThis.fetch = async () => ({ ok: true, json: async () => [{ id: 1 }] });
    assert.deepEqual(await fetchCategories(), [{ id: 1 }]);
    globalThis.fetch = async () => ({ ok: false, status: 503 });
    await assert.rejects(fetchItems, /HTTP 503/);
  }
  console.log('API HTTP-preview/HTTPS-production/explicit-base pagination, media and error checks passed');
} finally {
  globalThis.window = previous.window;
  globalThis.fetch = previous.fetch;
  if (previous.base === undefined) delete process.env.NEXT_PUBLIC_API_URL;
  else process.env.NEXT_PUBLIC_API_URL = previous.base;
}
