import { describe, it } from 'node:test';
import assert from 'node:assert';
import { extractR2KeyFromUrl } from '@/lib/r2';

describe('R2 Key Extraction & URL Handling', () => {
  it('extracts avatar key from custom domain URL', () => {
    const url = 'https://media.nanaflix.asia/avatars/user_123_456.webp';
    const key = extractR2KeyFromUrl(url);
    assert.strictEqual(key, 'avatars/user_123_456.webp');
  });

  it('extracts cover key from R2 storage endpoint URL', () => {
    const url = 'https://abc12345.r2.cloudflarestorage.com/nanaflix-media/covers/col_999.jpg';
    const key = extractR2KeyFromUrl(url);
    assert.strictEqual(key, 'nanaflix-media/covers/col_999.jpg');
  });

  it('handles relative storage path directly', () => {
    assert.strictEqual(extractR2KeyFromUrl('avatars/me.jpg'), 'avatars/me.jpg');
    assert.strictEqual(extractR2KeyFromUrl('covers/fav.png'), 'covers/fav.png');
  });

  it('returns null for non-R2 external URLs', () => {
    assert.strictEqual(extractR2KeyFromUrl('https://lh3.googleusercontent.com/a/abc'), null);
    assert.strictEqual(extractR2KeyFromUrl('https://example.com/photo.jpg'), null);
    assert.strictEqual(extractR2KeyFromUrl(''), null);
  });
});
