-- Add INSERT policy for admin users to create profiles
CREATE POLICY "Admin can insert profiles"
ON public.profiles
FOR INSERT
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Add UPDATE policy for admin users to update profiles
CREATE POLICY "Admin can update profiles"
ON public.profiles
FOR UPDATE
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
)
WITH CHECK (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Add DELETE policy for admin users to delete profiles
CREATE POLICY "Admin can delete profiles"
ON public.profiles
FOR DELETE
USING (
  auth.uid() IN (
    SELECT id FROM profiles WHERE role = 'admin'
  )
);

-- Allow authenticated users to update their own profile
CREATE POLICY "Users can update their own profile"
ON public.profiles
FOR UPDATE
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);
