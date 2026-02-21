-- Revoke unnecessary anon SELECT grants on vendors and tenants.
-- Portal routes use the service role client, so anon access is not needed.
-- This reduces the attack surface by preventing unauthenticated reads.

REVOKE SELECT ON vendors FROM anon;
REVOKE SELECT ON tenants FROM anon;
