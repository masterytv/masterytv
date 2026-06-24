-- =====================================================================
-- E7 — Safety: distinguish abuse / coercive-control flags from self-harm
-- =====================================================================
-- Applied to cloud (masterytv-website) 2026-06-24 via MCP. Additive +
-- backward-compatible: existing rows default to 'self_harm'. The coach's
-- crisis-detection now logs an abuse category (intimate-partner abuse /
-- coercive control) routed to DV resources, separate from self-harm.
-- =====================================================================

ALTER TABLE public.crisis_flags
  ADD COLUMN IF NOT EXISTS category text NOT NULL DEFAULT 'self_harm';
