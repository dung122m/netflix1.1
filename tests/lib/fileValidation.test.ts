import { describe, it } from 'node:test';
import assert from 'node:assert';
import { validateImageMagicBytes, sanitizeStorageKey } from '@/lib/fileValidation';

describe('File Validation & Magic Bytes Security', () => {
  it('detects valid JPEG magic bytes (FF D8 FF)', () => {
    const jpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const res = validateImageMagicBytes(jpegBuffer);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.mimeType, 'image/jpeg');
    assert.strictEqual(res.extension, 'jpg');
  });

  it('detects valid PNG magic bytes (89 50 4E 47 0D 0A 1A 0A)', () => {
    const pngBuffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const res = validateImageMagicBytes(pngBuffer);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.mimeType, 'image/png');
    assert.strictEqual(res.extension, 'png');
  });

  it('detects valid WebP magic bytes (RIFF...WEBP)', () => {
    // 0..3: RIFF, 4..7: size, 8..11: WEBP
    const webpBuffer = Buffer.from([
      0x52, 0x49, 0x46, 0x46, // RIFF
      0x20, 0x00, 0x00, 0x00, // file length
      0x57, 0x45, 0x42, 0x50, // WEBP
    ]);
    const res = validateImageMagicBytes(webpBuffer);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.mimeType, 'image/webp');
    assert.strictEqual(res.extension, 'webp');
  });

  it('detects valid GIF magic bytes (GIF87a / GIF89a)', () => {
    const gifBuffer = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00, 0x01, 0x00, 0x80, 0x00]);
    const res = validateImageMagicBytes(gifBuffer);
    assert.strictEqual(res.isValid, true);
    assert.strictEqual(res.mimeType, 'image/gif');
    assert.strictEqual(res.extension, 'gif');
  });

  it('rejects spoofed text/HTML/malicious script pretending to be image', () => {
    const maliciousBuffer = Buffer.from('<script>alert("XSS")</script>');
    const res = validateImageMagicBytes(maliciousBuffer);
    assert.strictEqual(res.isValid, false);
    assert.ok(res.error);
  });

  it('rejects empty or truncated buffer under 12 bytes', () => {
    const tinyBuffer = Buffer.from([0xff, 0xd8]);
    const res = validateImageMagicBytes(tinyBuffer);
    assert.strictEqual(res.isValid, false);
  });

  it('sanitizes storage keys and strips directory traversal attacks', () => {
    assert.strictEqual(
      sanitizeStorageKey('../../etc/passwd/avatar.png'),
      'etc/passwd/avatar.png'
    );
    assert.strictEqual(
      sanitizeStorageKey('avatars///user$123#photo!.webp'),
      'avatars/user_123_photo_.webp'
    );
  });
});
