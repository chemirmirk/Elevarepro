-- Update the handle_new_user function to initialize progress data
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.profiles (user_id, name)
  VALUES (NEW.id, NEW.raw_user_meta_data ->> 'name');
  
  -- Initialize streak data with zero values
  INSERT INTO public.streaks (user_id, streak_type, current_count, best_count, last_updated)
  VALUES 
    (NEW.id, 'daily_checkin', 0, 0, NULL),
    (NEW.id, 'goal_completion', 0, 0, NULL);
  
  -- Initialize basic goals with zero progress
  INSERT INTO public.goals (user_id, goal_type, target_amount, current_amount, target_unit, is_active)
  VALUES 
    (NEW.id, 'daily_checkin', 1, 0, 'checkins', true),
    (NEW.id, 'weekly_exercise', 3, 0, 'sessions', true),
    (NEW.id, 'water_intake', 8, 0, 'glasses', true);
  
  RETURN NEW;
END;
$$;