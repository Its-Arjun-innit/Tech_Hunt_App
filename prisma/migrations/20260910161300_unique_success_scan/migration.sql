-- A team may only bank one SUCCESS scan per checkpoint. Enforced in the
-- database so two concurrent requests cannot both award points.
CREATE UNIQUE INDEX "ScanEvent_team_checkpoint_success_key"
  ON "ScanEvent" ("teamId", "checkpointId")
  WHERE "result" = 'SUCCESS';
