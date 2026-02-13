-- Enable RLS on comercios table (ensure it is on)
ALTER TABLE "public"."comercios" ENABLE ROW LEVEL SECURITY;

-- Policy to allow INSERT for Super Admin (identified by email)
-- This is a fallback in case the Service Role is not used, though Service Role should be used.
CREATE POLICY "Allow insert for Super Admin"
ON "public"."comercios"
FOR INSERT
TO authenticated
WITH CHECK (
  auth.jwt() ->> 'email' = 'admin@govip.com'
);

-- Policy to allow SELECT for everyone (or at least authenticated)
-- Public profiles might need to be read by anyone (e.g. to resolve slugs)
CREATE POLICY "Allow public read access to comercios"
ON "public"."comercios"
FOR SELECT
TO public
USING (true);

-- Policy to allow UPDATE for the owner
CREATE POLICY "Allow update for Commerce Owner"
ON "public"."comercios"
FOR UPDATE
TO authenticated
USING (
  auth.uid() = owner_id 
  OR 
  auth.jwt() ->> 'email' = 'admin@govip.com'
);

-- Policy to allow DELETE for Super Admin
CREATE POLICY "Allow delete for Super Admin"
ON "public"."comercios"
FOR DELETE
TO authenticated
USING (
  auth.jwt() ->> 'email' = 'admin@govip.com'
);
