-- TagMe Fase 3 — RLS contract test fixtures (T003)
-- Applied by harness when INSFORGE_* env vars present.
-- Uses venue slug hotel-caribe; idempotent via ON CONFLICT / upsert patterns in harness.

-- Reference IDs are resolved at runtime from seeded data.
-- Expected structure after seed-hotel-caribe-staff.ts:
--   departments: RECEPCION, HK, FB, MANT
--   staff_members: ≥12 with active staff_nfc_tags
--   pilot users: supervisor (HK), manager, reception staff (RECEPCION)

COMMENT ON SCHEMA public IS 'F3 RLS fixtures loaded by tests/contract/003-staff harness';