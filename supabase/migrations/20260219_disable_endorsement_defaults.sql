-- Disable waiver_of_subrogation and additional_insured requirements by default
-- on all system-default requirement templates AND org-owned templates that were
-- duplicated from system defaults during onboarding.
--
-- These endorsements are often documented on separate pages (not the standard
-- ACORD certificate face page), which causes most COIs to be falsely flagged
-- as non-compliant. PMs can re-enable these per-template when needed.

-- 1. System-default templates
UPDATE template_coverage_requirements
SET requires_additional_insured = false,
    requires_waiver_of_subrogation = false
WHERE template_id IN (
  SELECT id FROM requirement_templates WHERE is_system_default = true
);

-- 2. Org-owned templates that were duplicated from system defaults during
--    onboarding (matched by name since there is no source_template_id FK).
--    Only updates rows that still have the old true/true defaults.
UPDATE template_coverage_requirements
SET requires_additional_insured = false,
    requires_waiver_of_subrogation = false
WHERE (requires_additional_insured = true OR requires_waiver_of_subrogation = true)
  AND template_id IN (
    SELECT t.id FROM requirement_templates t
    WHERE t.is_system_default = false
      AND t.name IN (
        SELECT s.name FROM requirement_templates s WHERE s.is_system_default = true
      )
  );
