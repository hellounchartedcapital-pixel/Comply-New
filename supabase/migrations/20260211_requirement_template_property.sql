-- Add property_id to requirement_templates so requirements can be assigned per property.
-- The coverages and endorsements JSONB columns already store all fields flexibly,
-- so no schema change is needed for the new coverage/endorsement options.

ALTER TABLE requirement_templates
  ADD COLUMN IF NOT EXISTS property_id UUID REFERENCES properties(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_req_templates_property
  ON requirement_templates(property_id);
