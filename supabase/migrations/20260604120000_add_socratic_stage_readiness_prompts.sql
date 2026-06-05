-- Store per-stage prompts used to generate hidden Socratic readiness goals.

ALTER TABLE public.assignment_socratic_configs
  ADD COLUMN IF NOT EXISTS clarify_readiness_prompt text,
  ADD COLUMN IF NOT EXISTS research_readiness_prompt text,
  ADD COLUMN IF NOT EXISTS build_readiness_prompt text,
  ADD COLUMN IF NOT EXISTS write_readiness_prompt text;

NOTIFY pgrst, 'reload schema';
