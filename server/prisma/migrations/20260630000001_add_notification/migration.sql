-- This migration is superseded by 20260630000000_add_notifications which
-- already creates the Notification table (with isRead) and PlatformStats.
-- Running this as a no-op prevents a duplicate-table error on deploy.
SELECT 1;
