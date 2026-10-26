-- ========================================================
-- MIGRATION: Update tasks_status_check to support 'Dalam Antrean'
-- ========================================================

-- 1. Drop old constraint and allow both 'Dalam Antrean' and 'Belum Dimulai'
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_status_check;
ALTER TABLE tasks ADD CONSTRAINT tasks_status_check 
  CHECK (status IN ('Dalam Antrean', 'Belum Dimulai', 'Sedang Dikerjakan', 'Menunggu Review', 'Revisi', 'Selesai'));

-- 2. Update existing rows if any
UPDATE tasks SET status = 'Dalam Antrean' WHERE status = 'Belum Dimulai';

-- 3. Update default value for status column
ALTER TABLE tasks ALTER COLUMN status SET DEFAULT 'Dalam Antrean';
