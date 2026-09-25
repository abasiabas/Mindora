# Schema Baseline Snapshots

Files here are full `pg_dump --schema-only` snapshots of the live
production database, taken directly from Supabase. They are NOT part
of the sequential migration chain in `../migrations/` and must never
be run automatically alongside it (running both would fail with
"relation already exists" errors, since this is a full dump, not an
incremental diff).

Purpose: disaster recovery reference, and documentation of what the
live schema actually contains, since `../migrations/` (0001-0005)
diverged from the live DB's real migration history (the live project
has migrations 001-016 applied directly via the Supabase dashboard/MCP,
most of which were never captured as repo files).

To use one of these for disaster recovery: restore into a FRESH,
EMPTY database only.
