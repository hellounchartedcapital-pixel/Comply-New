-- Disable waiver_of_subrogation and additional_insured requirements by default
-- on all system-default requirement templates.
--
-- These endorsements are often documented on separate pages (not the standard
-- ACORD certificate face page), which causes most COIs to be falsely flagged
-- as non-compliant. PMs can re-enable these per-template when needed.

UPDATE template_coverage_requirements
SET requires_additional_insured = false,
    requires_waiver_of_subrogation = false
WHERE template_id IN (
  SELECT id FROM requirement_templates WHERE is_system_default = true
);
