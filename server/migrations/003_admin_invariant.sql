UPDATE users
SET role = 'admin'
WHERE id = 'user-admin'
  AND NOT EXISTS (SELECT 1 FROM users WHERE role = 'admin');
