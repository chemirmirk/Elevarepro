-- Add unique constraint to prevent duplicate onboarding data
ALTER TABLE public.onboarding_data 
ADD CONSTRAINT unique_user_onboarding UNIQUE (user_id);

-- Clean up any existing duplicates (keep the latest one)
DELETE FROM public.onboarding_data
WHERE id NOT IN (
  SELECT DISTINCT ON (user_id) id
  FROM public.onboarding_data
  ORDER BY user_id, created_at DESC
);