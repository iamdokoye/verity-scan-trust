import { CryptoService } from '../services/crypto.service';

const { privateKey, publicKey } = CryptoService.generateKeyPair();

console.log('\n=== INSTITUTION RSA KEY PAIR ===\n');
console.log('Copy the following into your .env file (replace literal newlines with \\n):\n');

const escapeForEnv = (pem: string) => pem.replace(/\n/g, '\\n');

console.log(`INSTITUTION_PRIVATE_KEY_PEM="${escapeForEnv(privateKey)}"`);
console.log('');
console.log(`INSTITUTION_PUBLIC_KEY_PEM="${escapeForEnv(publicKey)}"`);
console.log('\nKeep the PRIVATE key secret. Distribute the PUBLIC key freely.\n');
