-- TagMe MVP — Initial Schema
-- Spec: specs/001-tagme-platform/data-model.md
-- Migration: 001_initial_schema.sql

BEGIN;

-- ---------------------------------------------------------------------------
-- Extensions
-- ---------------------------------------------------------------------------
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ---------------------------------------------------------------------------
-- Utility: auto-update updated_at on row modification
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- venues
-- ---------------------------------------------------------------------------
CREATE TABLE public.venues (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          TEXT        NOT NULL UNIQUE,
  name          TEXT        NOT NULL,
  brand         TEXT,
  timezone      TEXT        NOT NULL DEFAULT 'America/Bogota',
  contact_info  JSONB       NOT NULL DEFAULT '{}'::jsonb,
  is_pilot      BOOLEAN     NOT NULL DEFAULT false,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_venues_slug ON public.venues (slug);
CREATE INDEX idx_venues_is_pilot ON public.venues (is_pilot) WHERE is_pilot = true;

COMMENT ON TABLE public.venues IS 'Establecimiento (hotel, bar, restaurante)';
COMMENT ON COLUMN public.venues.contact_info IS 'JSON: { phone, whatsapp, reception_hours } for AVEX escalation';

-- ---------------------------------------------------------------------------
-- experience_configs
-- ---------------------------------------------------------------------------
CREATE TABLE public.experience_configs (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id         UUID        NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  title            TEXT        NOT NULL,
  welcome_message  TEXT,
  avex_enabled     BOOLEAN     NOT NULL DEFAULT false,
  destinations     JSONB       NOT NULL DEFAULT '[]'::jsonb,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_experience_configs_venue_id ON public.experience_configs (venue_id);

CREATE TRIGGER trg_experience_configs_updated_at
  BEFORE UPDATE ON public.experience_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON COLUMN public.experience_configs.destinations IS
  'Ordered array of hub destinations: menu | external | reservation_link | info | social';

-- ---------------------------------------------------------------------------
-- nfc_tags
-- ---------------------------------------------------------------------------
CREATE TABLE public.nfc_tags (
  id                    UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id              UUID        NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  slug                  TEXT        NOT NULL UNIQUE,
  label                 TEXT        NOT NULL,
  zone                  TEXT        NOT NULL,
  room_number           TEXT,
  experience_config_id  UUID        REFERENCES public.experience_configs (id) ON DELETE SET NULL,
  is_active             BOOLEAN     NOT NULL DEFAULT true,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT nfc_tags_zone_check CHECK (
    zone IN ('lobby', 'room', 'restaurant', 'bar', 'other')
  ),
  CONSTRAINT nfc_tags_room_number_zone_check CHECK (
    (zone = 'room' AND room_number IS NOT NULL)
    OR (zone <> 'room')
  )
);

CREATE INDEX idx_nfc_tags_slug ON public.nfc_tags (slug);
CREATE INDEX idx_nfc_tags_venue_id ON public.nfc_tags (venue_id);
CREATE INDEX idx_nfc_tags_venue_active ON public.nfc_tags (venue_id) WHERE is_active = true;
CREATE INDEX idx_nfc_tags_experience_config_id ON public.nfc_tags (experience_config_id);

COMMENT ON TABLE public.nfc_tags IS 'Punto físico NFC programado con slug único';

-- ---------------------------------------------------------------------------
-- knowledge_entries
-- ---------------------------------------------------------------------------
CREATE TABLE public.knowledge_entries (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  venue_id    UUID        NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  category    TEXT        NOT NULL,
  title       TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  is_active   BOOLEAN     NOT NULL DEFAULT true,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT knowledge_entries_category_check CHECK (
    category IN ('hours', 'amenities', 'policies', 'room_service', 'faq')
  )
);

CREATE INDEX idx_knowledge_entries_venue_id ON public.knowledge_entries (venue_id);
CREATE INDEX idx_knowledge_entries_venue_active ON public.knowledge_entries (venue_id, category)
  WHERE is_active = true;

CREATE TRIGGER trg_knowledge_entries_updated_at
  BEFORE UPDATE ON public.knowledge_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

COMMENT ON TABLE public.knowledge_entries IS 'Base de conocimiento AVEX por venue';

-- ---------------------------------------------------------------------------
-- touch_events
-- ---------------------------------------------------------------------------
CREATE TABLE public.touch_events (
  id                  UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  tag_id              UUID        NOT NULL REFERENCES public.nfc_tags (id) ON DELETE RESTRICT,
  venue_id            UUID        NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  channel             TEXT        NOT NULL,
  device_type         TEXT,
  country_code        TEXT,
  client_fingerprint  TEXT,
  deduplicated        BOOLEAN     NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT touch_events_channel_check CHECK (
    channel IN ('nfc', 'url_direct', 'staff_assisted')
  ),
  CONSTRAINT touch_events_device_type_check CHECK (
    device_type IS NULL OR device_type IN ('iphone', 'android', 'other')
  ),
  CONSTRAINT touch_events_country_code_check CHECK (
    country_code IS NULL OR country_code ~ '^[A-Z]{2}$'
  )
);

CREATE INDEX idx_touch_events_venue_created_at ON public.touch_events (venue_id, created_at DESC);
CREATE INDEX idx_touch_events_tag_id ON public.touch_events (tag_id);
CREATE INDEX idx_touch_events_dedup ON public.touch_events (venue_id, created_at)
  WHERE deduplicated = false;
CREATE INDEX idx_touch_events_fingerprint ON public.touch_events (client_fingerprint, tag_id, created_at DESC)
  WHERE client_fingerprint IS NOT NULL;

COMMENT ON TABLE public.touch_events IS 'Registro TagMétricas — toques NFC/URL';

-- ---------------------------------------------------------------------------
-- destination_visits
-- ---------------------------------------------------------------------------
CREATE TABLE public.destination_visits (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  touch_event_id    UUID        NOT NULL REFERENCES public.touch_events (id) ON DELETE CASCADE,
  destination_type  TEXT        NOT NULL,
  destination_url   TEXT,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT destination_visits_type_check CHECK (
    destination_type IN ('menu', 'external', 'reservation_link', 'info', 'social', 'avex')
  )
);

CREATE INDEX idx_destination_visits_touch_event_id ON public.destination_visits (touch_event_id);
CREATE INDEX idx_destination_visits_type ON public.destination_visits (destination_type);

-- ---------------------------------------------------------------------------
-- avex_sessions
-- ---------------------------------------------------------------------------
CREATE TABLE public.avex_sessions (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_token   TEXT        NOT NULL UNIQUE,
  tag_id          UUID        NOT NULL REFERENCES public.nfc_tags (id) ON DELETE RESTRICT,
  venue_id        UUID        NOT NULL REFERENCES public.venues (id) ON DELETE CASCADE,
  room_number     TEXT,
  message_count   INTEGER     NOT NULL DEFAULT 0,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT avex_sessions_message_count_check CHECK (message_count >= 0)
);

CREATE INDEX idx_avex_sessions_session_token ON public.avex_sessions (session_token);
CREATE INDEX idx_avex_sessions_venue_id ON public.avex_sessions (venue_id);
CREATE INDEX idx_avex_sessions_tag_id ON public.avex_sessions (tag_id);
CREATE INDEX idx_avex_sessions_created_at ON public.avex_sessions (created_at DESC);

COMMENT ON TABLE public.avex_sessions IS 'Sesión AVEX anónima — retención 90 días MVP';

-- ---------------------------------------------------------------------------
-- avex_messages
-- ---------------------------------------------------------------------------
CREATE TABLE public.avex_messages (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID        NOT NULL REFERENCES public.avex_sessions (id) ON DELETE CASCADE,
  role        TEXT        NOT NULL,
  content     TEXT        NOT NULL,
  escalated   BOOLEAN     NOT NULL DEFAULT false,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT avex_messages_role_check CHECK (
    role IN ('user', 'assistant', 'system')
  )
);

CREATE INDEX idx_avex_messages_session_id ON public.avex_messages (session_id);
CREATE INDEX idx_avex_messages_created_at ON public.avex_messages (session_id, created_at);

-- ---------------------------------------------------------------------------
-- user_profiles
-- ---------------------------------------------------------------------------
CREATE TABLE public.user_profiles (
  id            UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  auth_user_id  UUID        NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  venue_id      UUID        REFERENCES public.venues (id) ON DELETE SET NULL,
  role          TEXT        NOT NULL,
  display_name  TEXT        NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT user_profiles_role_check CHECK (
    role IN ('staff', 'admin', 'ops')
  ),
  CONSTRAINT user_profiles_staff_venue_check CHECK (
    role IN ('admin', 'ops') OR venue_id IS NOT NULL
  )
);

CREATE INDEX idx_user_profiles_auth_user_id ON public.user_profiles (auth_user_id);
CREATE INDEX idx_user_profiles_venue_id ON public.user_profiles (venue_id);

COMMENT ON TABLE public.user_profiles IS 'Staff/admin/ops mapped to venues via InsForge Auth';

-- ---------------------------------------------------------------------------
-- content_audit_log (NFR-006 — admin-api.md)
-- ---------------------------------------------------------------------------
CREATE TABLE public.content_audit_log (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        REFERENCES auth.users (id) ON DELETE SET NULL,
  venue_id    UUID        REFERENCES public.venues (id) ON DELETE SET NULL,
  entity      TEXT        NOT NULL,
  entity_id   UUID        NOT NULL,
  action      TEXT        NOT NULL,
  diff        JSONB       NOT NULL DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT content_audit_log_entity_check CHECK (
    entity IN ('experience_config', 'knowledge_entry', 'nfc_tag')
  ),
  CONSTRAINT content_audit_log_action_check CHECK (
    action IN ('create', 'update', 'delete')
  )
);

CREATE INDEX idx_content_audit_log_venue_id ON public.content_audit_log (venue_id, created_at DESC);
CREATE INDEX idx_content_audit_log_entity ON public.content_audit_log (entity, entity_id);
CREATE INDEX idx_content_audit_log_user_id ON public.content_audit_log (user_id);

COMMENT ON TABLE public.content_audit_log IS 'Audit trail for CMS changes (experience, KB, tags)';

COMMIT;