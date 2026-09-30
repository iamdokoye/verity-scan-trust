process.env.DATABASE_URL = 'postgresql://u:p@localhost:5432/db';
process.env.SUPABASE_URL = 'https://t.supabase.co';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'k';
process.env.SUPABASE_ANON_KEY = 'k';
process.env.SUPABASE_JWKS_URL = 'https://t.supabase.co/jwks';
process.env.INSTITUTION_PRIVATE_KEY_PEM = 'x';
process.env.INSTITUTION_PUBLIC_KEY_PEM = 'x';
process.env.FRONTEND_URL = 'http://localhost:3000';

import { withApplicationName } from '../prisma';

describe('withApplicationName', () => {
  it('labels the connection so the database can tell the API from direct access', () => {
    expect(withApplicationName('postgresql://u:p@h:5432/db')).toBe('postgresql://u:p@h:5432/db?application_name=votta-api');
    expect(withApplicationName('postgresql://u:p@h/db?pgbouncer=true')).toBe(
      'postgresql://u:p@h/db?pgbouncer=true&application_name=votta-api',
    );
  });

  it('keeps a name the operator already set', () => {
    const url = 'postgresql://u:p@h/db?application_name=custom';
    expect(withApplicationName(url)).toBe(url);
  });
});
