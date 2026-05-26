-- =============================================================================
-- Tamper Simulation Function (Demo / Admin Only)
-- =============================================================================
-- This function is called by the admin tamper simulation endpoint
-- (PATCH /api/v1/admin/tamper/:documentId) for demo purposes only.
-- It overwrites a single byte in the stored file path metadata to simulate
-- what happens when a document is tampered with after signing.
--
-- In the real demo flow:
--   1. Upload and approve a document → status: verified
--   2. Call PATCH /api/v1/admin/tamper/:documentId
--   3. Re-verify the same token → status: tampered
--
-- This is purely for demonstration. Remove from production.
--
-- HOW TO DEPLOY:
--   Run in Supabase SQL Editor after all other migrations.
-- =============================================================================

-- Admin helper: corrupt the stored sha256 hash to simulate tampering.
-- The verification service re-downloads the file and recomputes the hash.
-- If the recomputed hash no longer matches what is stored, it returns TAMPERED.
-- By corrupting the stored hash we can reliably trigger this in demos.
CREATE OR REPLACE FUNCTION public.simulate_document_tamper(doc_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.documents
  SET    sha256Hash = 'deadbeef' || substring(sha256Hash, 9)
  WHERE  id = doc_id
  AND    status = 'approved';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document % not found or not in approved status', doc_id;
  END IF;
END;
$$;

-- Only the service role should call this
REVOKE EXECUTE ON FUNCTION public.simulate_document_tamper FROM authenticated, anon, public;
