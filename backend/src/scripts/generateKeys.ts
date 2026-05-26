import crypto from 'crypto';

const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
});

console.log('\n=== INSTITUTION RSA KEY PAIR ===\n');
console.log('Copy the following into your .env file (replace literal newlines with \\n):\n');

const escapeForEnv = (pem: string) => pem.replace(/\n/g, '\\n');

console.log(`INSTITUTION_PRIVATE_KEY_PEM="${escapeForEnv(privateKey)}"`);
console.log('');
console.log(`INSTITUTION_PUBLIC_KEY_PEM="${escapeForEnv(publicKey)}"`);
console.log('\nKeep the PRIVATE key secret. Distribute the PUBLIC key freely.\n');
