-- Migration: Admin role system
-- Adds role column ('user' | 'admin' | 'superadmin') with trigger to
-- keep legacy is_admin boolean in sync. Sets tom@masterytv.com as superadmin.

ALTER TABLE users
ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user'
  CHECK (role IN ('user', 'admin', 'superadmin'));

UPDATE users SET role = 'admin'
WHERE is_admin = true AND email != 'tom@masterytv.com';

UPDATE users SET role = 'superadmin', is_admin = true
WHERE email = 'tom@masterytv.com';

CREATE OR REPLACE FUNCTION sync_is_admin_from_role()
RETURNS TRIGGER AS $$
BEGIN
  NEW.is_admin := NEW.role IN ('admin', 'superadmin');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_is_admin ON users;
CREATE TRIGGER trg_sync_is_admin
  BEFORE INSERT OR UPDATE OF role ON users
  FOR EACH ROW EXECUTE FUNCTION sync_is_admin_from_role();

-- Admins and superadmins can read all user rows
CREATE POLICY "Admins can read all users"
  ON users FOR SELECT
  USING (
    auth.uid() = id
    OR EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'superadmin')
    )
  );
