-- Proof of Contribution extends the shared posts/feed model without breaking
-- existing Proof of Sweat flows. Sweat remains workout_json-backed content;
-- contribution becomes a typed post with its own structured payload + artifacts.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'post_type') THEN
    CREATE TYPE public.post_type AS ENUM ('proof_of_sweat', 'proof_of_contribution');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contribution_type') THEN
    CREATE TYPE public.contribution_type AS ENUM (
      'research',
      'coding',
      'design',
      'outreach',
      'ops',
      'automation',
      'analysis',
      'custom'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'contribution_status') THEN
    CREATE TYPE public.contribution_status AS ENUM (
      'completed',
      'partial',
      'failed',
      'in_review'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE public.verification_status AS ENUM (
      'self_reported',
      'human_verified',
      'system_verified'
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'artifact_type') THEN
    CREATE TYPE public.artifact_type AS ENUM (
      'image',
      'link',
      'text',
      'file'
    );
  END IF;
END $$;

ALTER TABLE public.posts
  ADD COLUMN IF NOT EXISTS post_type public.post_type NOT NULL DEFAULT 'proof_of_sweat';

UPDATE public.posts
SET post_type = 'proof_of_sweat'
WHERE post_type IS NULL;

CREATE INDEX IF NOT EXISTS idx_posts_post_type_created_at
  ON public.posts (post_type, created_at DESC);

CREATE TABLE IF NOT EXISTS public.proof_of_contributions (
  post_id UUID PRIMARY KEY REFERENCES public.posts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  contribution_type public.contribution_type NOT NULL DEFAULT 'custom',
  task_brief TEXT NOT NULL,
  workflow_summary TEXT NOT NULL,
  result_summary TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  duration_minutes INTEGER,
  status public.contribution_status NOT NULL DEFAULT 'completed',
  verification_status public.verification_status NOT NULL DEFAULT 'self_reported',
  accepted_by_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  accepted_at TIMESTAMPTZ,
  verifier_note TEXT,
  task_id TEXT,
  bounty_id TEXT,
  attestation_hash TEXT,
  external_reference TEXT,
  reproducibility_metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT proof_of_contributions_duration_minutes_check
    CHECK (duration_minutes IS NULL OR duration_minutes >= 0),
  CONSTRAINT proof_of_contributions_acceptance_check
    CHECK (
      (accepted_by_user_id IS NULL AND accepted_at IS NULL)
      OR (accepted_by_user_id IS NOT NULL AND accepted_at IS NOT NULL)
    ),
  CONSTRAINT proof_of_contributions_completed_order_check
    CHECK (
      started_at IS NULL
      OR completed_at IS NULL
      OR completed_at >= started_at
    )
);

COMMENT ON TABLE public.proof_of_contributions IS
  'Structured agent contribution payload keyed to the shared posts table.';

CREATE INDEX IF NOT EXISTS idx_proof_of_contributions_type
  ON public.proof_of_contributions (contribution_type, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proof_of_contributions_status
  ON public.proof_of_contributions (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_proof_of_contributions_verification
  ON public.proof_of_contributions (verification_status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.proof_of_contribution_artifacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contribution_post_id UUID NOT NULL REFERENCES public.proof_of_contributions(post_id) ON DELETE CASCADE,
  artifact_type public.artifact_type NOT NULL,
  label TEXT NOT NULL,
  url TEXT,
  storage_path TEXT,
  notes TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT proof_of_contribution_artifacts_location_check
    CHECK (
      artifact_type = 'text'
      OR url IS NOT NULL
      OR storage_path IS NOT NULL
    )
);

COMMENT ON TABLE public.proof_of_contribution_artifacts IS
  'Evidence rows attached to Proof of Contribution entries.';

CREATE INDEX IF NOT EXISTS idx_proof_of_contribution_artifacts_post
  ON public.proof_of_contribution_artifacts (contribution_post_id, sort_order, created_at);

CREATE OR REPLACE FUNCTION public.set_proof_of_contribution_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_proof_of_contributions_updated_at ON public.proof_of_contributions;
CREATE TRIGGER trg_proof_of_contributions_updated_at
BEFORE UPDATE ON public.proof_of_contributions
FOR EACH ROW EXECUTE FUNCTION public.set_proof_of_contribution_updated_at();

DROP TRIGGER IF EXISTS trg_proof_of_contribution_artifacts_updated_at ON public.proof_of_contribution_artifacts;
CREATE TRIGGER trg_proof_of_contribution_artifacts_updated_at
BEFORE UPDATE ON public.proof_of_contribution_artifacts
FOR EACH ROW EXECUTE FUNCTION public.set_proof_of_contribution_updated_at();

ALTER TABLE public.proof_of_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.proof_of_contribution_artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS proof_of_contributions_read ON public.proof_of_contributions;
CREATE POLICY proof_of_contributions_read ON public.proof_of_contributions
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = public.proof_of_contributions.post_id
      AND (
        p.author_id = auth.uid()
        OR p.visibility = 'public'
        OR EXISTS (
          SELECT 1
          FROM public.user_token_holdings h
          WHERE h.user_id = auth.uid()
            AND h.athlete_id = p.author_id
            AND h.balance >= GREATEST(1, p.min_tokens_required)
        )
      )
  )
);

DROP POLICY IF EXISTS proof_of_contributions_write ON public.proof_of_contributions;
CREATE POLICY proof_of_contributions_write ON public.proof_of_contributions
FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = public.proof_of_contributions.post_id
      AND p.author_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = public.proof_of_contributions.post_id
      AND p.author_id = auth.uid()
  )
);

DROP POLICY IF EXISTS proof_of_contribution_artifacts_read ON public.proof_of_contribution_artifacts;
CREATE POLICY proof_of_contribution_artifacts_read ON public.proof_of_contribution_artifacts
FOR SELECT USING (
  EXISTS (
    SELECT 1
    FROM public.proof_of_contributions c
    JOIN public.posts p ON p.id = c.post_id
    WHERE c.post_id = public.proof_of_contribution_artifacts.contribution_post_id
      AND (
        p.author_id = auth.uid()
        OR p.visibility = 'public'
        OR EXISTS (
          SELECT 1
          FROM public.user_token_holdings h
          WHERE h.user_id = auth.uid()
            AND h.athlete_id = p.author_id
            AND h.balance >= GREATEST(1, p.min_tokens_required)
        )
      )
  )
);

DROP POLICY IF EXISTS proof_of_contribution_artifacts_write ON public.proof_of_contribution_artifacts;
CREATE POLICY proof_of_contribution_artifacts_write ON public.proof_of_contribution_artifacts
FOR ALL USING (
  EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = public.proof_of_contribution_artifacts.contribution_post_id
      AND p.author_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM public.posts p
    WHERE p.id = public.proof_of_contribution_artifacts.contribution_post_id
      AND p.author_id = auth.uid()
  )
);

INSERT INTO storage.buckets (id, name, public)
VALUES ('contribution-media', 'contribution-media', true)
ON CONFLICT (id) DO NOTHING;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Contribution media is publicly accessible'
  ) THEN
    CREATE POLICY "Contribution media is publicly accessible"
    ON storage.objects
    FOR SELECT
    USING (bucket_id = 'contribution-media');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can upload their own contribution media'
  ) THEN
    CREATE POLICY "Users can upload their own contribution media"
    ON storage.objects
    FOR INSERT
    WITH CHECK (
      bucket_id = 'contribution-media'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can update their own contribution media'
  ) THEN
    CREATE POLICY "Users can update their own contribution media"
    ON storage.objects
    FOR UPDATE
    USING (
      bucket_id = 'contribution-media'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'Users can delete their own contribution media'
  ) THEN
    CREATE POLICY "Users can delete their own contribution media"
    ON storage.objects
    FOR DELETE
    USING (
      bucket_id = 'contribution-media'
      AND auth.uid()::text = (storage.foldername(name))[1]
    );
  END IF;
END $$;
