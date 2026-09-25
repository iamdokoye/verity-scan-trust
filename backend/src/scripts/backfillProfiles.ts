/**
 * Backfills the `profiles` table for Supabase auth users that were created
 * before authService.signup started writing a Profile row.
 *
 * Without a matching `profiles` row, the custom access token hook
 * (supabase/migrations/20240101000001_custom_access_token_hook.sql) can't
 * inject `user_role`/`institution_id` into the JWT, so every request from
 * that account 401s with "Invalid token claims".
 *
 * Run with: npm run backfill:profiles
 */
import { supabase } from '../config/supabase';
import { prisma } from '../config/prisma';
import { UserRole } from '@prisma/client';

const PAGE_SIZE = 200;

async function main() {
  console.log('Scanning Supabase auth users for missing profiles...\n');

  let page = 1;
  let created = 0;
  let skipped = 0;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: PAGE_SIZE });
    if (error) throw new Error(`Could not list users: ${error.message}`);
    if (data.users.length === 0) break;

    for (const user of data.users) {
      const existing = await prisma.profile.findUnique({ where: { id: user.id } });
      if (existing) continue;

      const meta = user.user_metadata as {
        role?: string;
        institution_id?: string;
        full_name?: string;
      };
      const role = (meta.role as UserRole) ?? 'student';

      if (role !== 'super_admin' && !meta.institution_id) {
        console.warn(`✗ Skipping ${user.email} (${user.id}) — no institution_id in metadata`);
        skipped++;
        continue;
      }

      await prisma.profile.create({
        data: {
          id: user.id,
          institutionId: meta.institution_id,
          role,
          fullName: meta.full_name,
          email: user.email!,
        },
      });
      console.log(`✓ Created profile for ${user.email} (${user.id}), role=${role}`);
      created++;
    }

    if (data.users.length < PAGE_SIZE) break;
    page++;
  }

  console.log(`\nDone. Created ${created} profile(s), skipped ${skipped}.`);
}

main()
  .catch((e) => {
    console.error('Backfill failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
