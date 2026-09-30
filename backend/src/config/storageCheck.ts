import { supabase } from './supabase';
import { env } from './env';
import { logger } from '../utils/logger';

/**
 * Confirm at startup that the configured storage bucket exists. A wrong
 * SUPABASE_STORAGE_BUCKET otherwise only shows up later, as a failed upload
 * or a "tampered" verification result, so say so in the logs immediately.
 * Never stops the server: the API can still serve everything else.
 */
export async function checkStorageBucket(): Promise<boolean> {
  const bucket = env.SUPABASE_STORAGE_BUCKET;
  try {
    const { data, error } = await supabase.storage.listBuckets();
    if (error) {
      logger.warn('Could not list storage buckets to verify SUPABASE_STORAGE_BUCKET', {
        error: error.message,
      });
      return false;
    }

    const names = (data ?? []).map((b) => b.name);
    if (names.includes(bucket)) {
      logger.info(`Storage bucket "${bucket}" found`);
      return true;
    }

    logger.error(
      `Storage bucket "${bucket}" does not exist. Uploads, previews and verification of ` +
        'stored files will fail until SUPABASE_STORAGE_BUCKET is set to an existing bucket.',
      { configured: bucket, available: names }
    );
    return false;
  } catch (err) {
    logger.warn('Storage bucket check failed', {
      error: err instanceof Error ? err.message : String(err),
    });
    return false;
  }
}
