-- Add unique constraint for goal_progress upsert functionality
ALTER TABLE public.goal_progress 
ADD CONSTRAINT goal_progress_goal_date_unique 
UNIQUE (goal_id, recorded_date);