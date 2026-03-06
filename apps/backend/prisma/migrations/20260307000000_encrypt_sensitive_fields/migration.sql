-- Migration: encrypt_sensitive_fields
-- Changes: PaymentConfig.keysJson from JSON to TEXT (String).
-- Rationale: The column now stores an AES-256-GCM encrypted blob
--   in the format: iv:authTag:ciphertext (all hex-encoded).
--   Application-level EncryptionService handles encrypt/decrypt.

ALTER TABLE "PaymentConfig" ALTER COLUMN "keysJson" TYPE TEXT USING "keysJson"::TEXT;

-- NOTE: Existing plaintext JSON rows will be returned as-is by EncryptionService.decrypt()
-- via the graceful fallback path. Re-save them through the admin UI to encrypt them.
