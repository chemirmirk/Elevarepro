-- Fix the search path for the function
CREATE OR REPLACE FUNCTION public.insert_common_exercises()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
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