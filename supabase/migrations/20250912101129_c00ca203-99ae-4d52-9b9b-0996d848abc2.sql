-- Fix the extract function type issue in sync_onboarding_goals
CREATE OR REPLACE FUNCTION public.sync_onboarding_goals()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  goal_data jsonb;
  gym_goal jsonb;
  smoking_goal jsonb;
  end_date_calc date;
  duration_calc integer;
BEGIN
  goal_data := NEW.goals;
  
  -- Handle gym goal
  IF goal_data ? 'gym' THEN
    gym_goal := goal_data->'gym';
    
    INSERT INTO public.goals (
      user_id, 
      goal_type, 
      target_amount, 
      current_amount, 
      target_unit,
      goal_description,
      start_date,
      end_date,
      duration_days,
      reminder_frequency,
      is_active
    ) 
    VALUES (
      NEW.user_id,
      'gym_consistency',
      (gym_goal->>'frequency')::integer * 4, -- 4 weeks worth
      0,
      'sessions',
      'Go to gym ' || (gym_goal->>'frequency') || ' times per week',
      CURRENT_DATE,
      CURRENT_DATE + INTERVAL '28 days', -- 4 weeks
      28,
      'daily',
      true
    )
    ON CONFLICT (user_id, goal_type) WHERE goal_type = 'gym_consistency'
    DO UPDATE SET
      target_amount = (gym_goal->>'frequency')::integer * 4,
      goal_description = 'Go to gym ' || (gym_goal->>'frequency') || ' times per week',
      updated_at = now();
  END IF;
  
  -- Handle smoking goal
  IF goal_data ? 'smoking' THEN
    smoking_goal := goal_data->'smoking';
    
    -- Calculate end date based on timeframe
    CASE smoking_goal->>'timeframe'
      WHEN '1-month' THEN end_date_calc := CURRENT_DATE + INTERVAL '30 days';
      WHEN '3-months' THEN end_date_calc := CURRENT_DATE + INTERVAL '90 days';
      WHEN '6-months' THEN end_date_calc := CURRENT_DATE + INTERVAL '180 days';
      WHEN '1-year' THEN end_date_calc := CURRENT_DATE + INTERVAL '365 days';
      ELSE end_date_calc := CURRENT_DATE + INTERVAL '30 days';
    END CASE;
    
    -- Calculate duration in days properly
    duration_calc := (end_date_calc - CURRENT_DATE);
    
    INSERT INTO public.goals (
      user_id,
      goal_type,
      target_amount,
      current_amount,
      target_unit,
      goal_description,
      start_date,
      end_date,
      duration_days,
      reminder_frequency,
      is_active
    )
    VALUES (
      NEW.user_id,
      'smoking_cessation',
      COALESCE((smoking_goal->>'targetAmount')::integer, 0),
      (smoking_goal->>'currentAmount')::integer,
      'cigarettes_per_day',
      'Reduce smoking from ' || (smoking_goal->>'currentAmount') || ' to ' || 
      COALESCE(smoking_goal->>'targetAmount', '0') || ' cigarettes per day',
      CURRENT_DATE,
      end_date_calc,
      duration_calc,
      'daily',
      true
    )
    ON CONFLICT (user_id, goal_type) WHERE goal_type = 'smoking_cessation'
    DO UPDATE SET
      target_amount = COALESCE((smoking_goal->>'targetAmount')::integer, 0),
      current_amount = (smoking_goal->>'currentAmount')::integer,
      goal_description = 'Reduce smoking from ' || (smoking_goal->>'currentAmount') || ' to ' || 
                        COALESCE(smoking_goal->>'targetAmount', '0') || ' cigarettes per day',
      end_date = end_date_calc,
      duration_days = (end_date_calc - CURRENT_DATE),
      updated_at = now();
  END IF;
  
  RETURN NEW;
END;
$function$