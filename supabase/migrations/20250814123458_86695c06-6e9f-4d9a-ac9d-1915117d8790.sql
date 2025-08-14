-- First, delete duplicate onboarding records (keep the latest one for each user)
DELETE FROM public.onboarding_data
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.onboarding_data
  ORDER BY user_id, created_at DESC
);

-- Now add the unique constraint
ALTER TABLE public.onboarding_data 
ADD CONSTRAINT unique_user_onboarding UNIQUE (user_id);