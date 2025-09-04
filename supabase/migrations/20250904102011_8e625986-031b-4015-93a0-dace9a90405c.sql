-- Update RLS policy for exercises to allow viewing common exercises
DROP POLICY "Users can view their own exercises" ON public.exercises;

CREATE POLICY "Users can view their own exercises and common exercises" 
ON public.exercises 
FOR SELECT 
USING (auth.uid() = user_id OR is_custom = false);

-- Delete the incorrectly inserted common exercises
DELETE FROM public.exercises WHERE user_id = '00000000-0000-0000-0000-000000000000';

-- Create a function to insert common exercises that can be viewed by everyone
CREATE OR REPLACE FUNCTION public.insert_common_exercises()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert common exercises with a system user ID that bypasses RLS
  INSERT INTO public.exercises (user_id, name, muscle_group, description, is_custom) VALUES
    (gen_random_uuid(), 'Bench Press', 'Chest', 'Classic chest exercise', false),
    (gen_random_uuid(), 'Squat', 'Legs', 'Compound leg exercise', false),
    (gen_random_uuid(), 'Deadlift', 'Back', 'Full body compound movement', false),
    (gen_random_uuid(), 'Pull-ups', 'Back', 'Bodyweight back exercise', false),
    (gen_random_uuid(), 'Overhead Press', 'Shoulders', 'Shoulder and core exercise', false),
    (gen_random_uuid(), 'Barbell Row', 'Back', 'Compound back exercise', false),
    (gen_random_uuid(), 'Dips', 'Chest', 'Bodyweight chest exercise', false),
    (gen_random_uuid(), 'Bicep Curls', 'Arms', 'Isolation arm exercise', false),
    (gen_random_uuid(), 'Tricep Dips', 'Arms', 'Bodyweight tricep exercise', false),
    (gen_random_uuid(), 'Lunges', 'Legs', 'Single-leg compound exercise', false),
    (gen_random_uuid(), 'Push-ups', 'Chest', 'Bodyweight chest exercise', false),
    (gen_random_uuid(), 'Lat Pulldown', 'Back', 'Machine back exercise', false),
    (gen_random_uuid(), 'Shoulder Raises', 'Shoulders', 'Shoulder isolation exercise', false),
    (gen_random_uuid(), 'Leg Press', 'Legs', 'Machine leg exercise', false),
    (gen_random_uuid(), 'Plank', 'Core', 'Isometric core exercise', false);
END;
$$;

-- Execute the function to insert common exercises
SELECT public.insert_common_exercises();