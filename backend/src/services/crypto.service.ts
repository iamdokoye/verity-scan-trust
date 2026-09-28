import crypto from 'crypto';
import QRCode from 'qrcode';
import { env } from '../config/env';

export class CryptoService {
  hashFile(buffer: Buffer): string {
    return crypto.createHash('sha256').update(buffer).digest('hex');
  }

  signHash(hash: string): string {
    const sign = crypto.createSign('sha256');
    sign.update(Buffer.from(hash, 'hex'));
    sign.end();
    return sign.sign(env.INSTITUTION_PRIVATE_KEY_PEM, 'base64');
  }

  verifySignature(hash: string, signatureBase64: string): boolean {
    try {
      const verify = crypto.createVerify('sha256');
      verify.update(Buffer.from(hash, 'hex'));
      verify.end();
      return verify.verify(env.INSTITUTION_PUBLIC_KEY_PEM, signatureBase64, 'base64');
    } catch {
      return false;
    }
  }

  /**
   * Short, human-typeable code shown on documents and QR-linked for public
   * verification. Excludes 0/O/1/I/L to avoid misreads. 32^8 (~1.1 trillion)
   * combinations is ample given the unique DB constraint + retry-on-collision
   * in document.service.ts.
   */
  generateVerificationToken(): string {
    const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    let token = '';
    for (let i = 0; i < 8; i++) {
      token += alphabet[crypto.randomInt(alphabet.length)];
    }
    return token;
  }

  async generateQRCode(verificationUrl: string): Promise<string> {
    return QRCode.toDataURL(verificationUrl, {
      errorCorrectionLevel: 'H',
      margin: 2,
      width: 300,
    });
  }

  static generateKeyPair(): { privateKey: string; publicKey: string } {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    return { privateKey, publicKey };
  }
}

export const cryptoService = new CryptoService();
