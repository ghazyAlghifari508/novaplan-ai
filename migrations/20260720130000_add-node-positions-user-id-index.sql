-- Add missing FK index on node_positions.user_id.
-- InsForge Advisor flagged performance/missing-fk-index: JOINs and
-- ON DELETE CASCADE scans were doing seq scans / holding full table locks.
-- ponytail: CONCURRENTLY not available in migration transactions;
-- this table is small (visual state only), plain CREATE INDEX is fine.
CREATE INDEX IF NOT EXISTS idx_node_positions_user_id
  ON public.node_positions(user_id);
