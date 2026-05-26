/**
 * Unit tests for CryptoService
 *
 * These tests run with no external dependencies — they generate a fresh
 * key pair at test startup and use it for all sign/verify operations.
 */

// Stub env before any module imports that read process.env
const { privateKey, publicKey } = (() => {
  const crypto = require('crypto');
  return crypto.generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding:  { type: 'spki',  format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });
})();

process.env.SUPABASE_URL             = 'https://test.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.SUPABASE_ANON_KEY         = 'test-anon-key';
process.env.SUPABASE_JWKS_URL         = 'https://test.supabase.co/auth/v1/.well-known/jwks.json';
process.env.SUPABASE_STORAGE_BUCKET   = 'votta-documents';
process.env.DATABASE_URL              = 'postgresql://test:test@localhost:5432/test';
process.env.INSTITUTION_PRIVATE_KEY_PEM = privateKey;
process.env.INSTITUTION_PUBLIC_KEY_PEM  = publicKey;
process.env.FRONTEND_URL             = 'http://localhost:5173';
process.env.PORT                     = '3000';
process.env.NODE_ENV                 = 'test';

import { CryptoService } from '../crypto.service';

describe('CryptoService', () => {
  let service: CryptoService;

  beforeAll(() => {
    service = new CryptoService();
  });

  // ── hashFile ──────────────────────────────────────────────────────────────

  describe('hashFile()', () => {
    it('returns a 64-character lowercase hex string', () => {
      const hash = service.hashFile(Buffer.from('hello world'));
      expect(hash).toHaveLength(64);
      expect(hash).toMatch(/^[0-9a-f]+$/);
    });

    it('produces the same hash for identical content (deterministic)', () => {
      const content = Buffer.from('consistent test content');
      expect(service.hashFile(content)).toBe(service.hashFile(content));
    });

    it('produces different hashes for different content (tamper detection)', () => {
      const original  = Buffer.from('original document content');
      const tampered  = Buffer.from('tampered document content');
      expect(service.hashFile(original)).not.toBe(service.hashFile(tampered));
    });

    it('detects a single-byte change', () => {
      const original = Buffer.from('ABCDEFGHIJKLMNOP');
      const tampered  = Buffer.from(original);
      tampered[0] = 0x00;  // flip first byte
      expect(service.hashFile(original)).not.toBe(service.hashFile(tampered));
    });
  });

  // ── signHash / verifySignature ─────────────────────────────────────────────

  describe('signHash() / verifySignature()', () => {
    it('signs a hash and verifies it successfully (round-trip)', () => {
      const content   = Buffer.from('document to sign');
      const hash      = service.hashFile(content);
      const signature = service.signHash(hash);

      expect(signature).toBeTruthy();
      expect(service.verifySignature(hash, signature)).toBe(true);
    });

    it('fails verification when the signature is invalid', () => {
      const hash             = service.hashFile(Buffer.from('some content'));
      const badSignature     = 'aW52YWxpZHNpZ25hdHVyZQ=='; // base64 "invalidsignature"
      expect(service.verifySignature(hash, badSignature)).toBe(false);
    });

    it('fails verification when the hash does not match the signed hash', () => {
      const originalContent = Buffer.from('original content');
      const tamperedContent = Buffer.from('tampered content');
      const originalHash    = service.hashFile(originalContent);
      const tamperedHash    = service.hashFile(tamperedContent);
      const signature       = service.signHash(originalHash);

      expect(service.verifySignature(tamperedHash, signature)).toBe(false);
    });

    it('returns false (does not throw) for malformed signature', () => {
      const hash = service.hashFile(Buffer.from('content'));
      expect(() => service.verifySignature(hash, 'not-base64!!!')).not.toThrow();
      expect(service.verifySignature(hash, 'not-base64!!!')).toBe(false);
    });
  });

  // ── generateVerificationToken ─────────────────────────────────────────────

  describe('generateVerificationToken()', () => {
    it('returns a 64-character hex string', () => {
      const token = service.generateVerificationToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]+$/);
    });

    it('generates unique tokens on each call', () => {
      const t1 = service.generateVerificationToken();
      const t2 = service.generateVerificationToken();
      expect(t1).not.toBe(t2);
    });
  });

  // ── generateQRCode ─────────────────────────────────────────────────────────

  describe('generateQRCode()', () => {
    it('returns a data URI for a valid verification URL', async () => {
      const url = 'https://votta.app/verify?token=abc123';
      const qr  = await service.generateQRCode(url);
      expect(qr).toMatch(/^data:image\/png;base64,/);
    });
  });

  // ── generateKeyPair (static) ──────────────────────────────────────────────

  describe('generateKeyPair() static', () => {
    it('produces PEM-formatted RSA private and public keys', () => {
      const { privateKey: priv, publicKey: pub } = CryptoService.generateKeyPair();
      expect(priv).toContain('-----BEGIN PRIVATE KEY-----');
      expect(pub).toContain('-----BEGIN PUBLIC KEY-----');
    });

    it('generates unique key pairs on each call', () => {
      const kp1 = CryptoService.generateKeyPair();
      const kp2 = CryptoService.generateKeyPair();
      expect(kp1.privateKey).not.toBe(kp2.privateKey);
    });
  });
});
