-- Add DELETE policy for achievements table
CREATE POLICY "Users can delete their own achievements" 
ON public.achievements 
FOR DELETE 
USING (auth.uid() = user_id);