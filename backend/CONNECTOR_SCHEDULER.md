# Connector recovery

Scheduled and manual syncs hold a PostgreSQL session advisory lock on a dedicated
connection until their final status is committed. Ordinary sync commits do not
release this lock. The scheduler revisits `syncing` rows, including interrupted
manual syncs with scheduling disabled. It resumes a row only if no worker holds
its advisory lock. Disabled schedules remain disabled after recovery.

PostgreSQL releases the lock when it detects that the owning session has ended.
Recovery therefore happens on a subsequent scheduler tick (normally every 60
seconds), after disconnection is detected. A hung process with a live database
connection is not automatically terminated or taken over.

Deployment requirements:

- Stop all old workers before starting this version: old workers do not hold
  advisory locks and must not overlap with the recovery scheduler.
- Use direct PostgreSQL connections or session pooling, not transaction pooling.
- Allow one extra database connection per concurrently running connector sync.

The regression tests simulate worker interleaving and lock ownership; they do not
exercise process termination against a live PostgreSQL server.
