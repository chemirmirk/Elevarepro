-- Create exercises table
CREATE TABLE public.exercises (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  muscle_group TEXT,
  description TEXT,
  is_custom BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout sessions table
CREATE TABLE public.workout_sessions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  name TEXT,
  duration_minutes INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create workout sets table
CREATE TABLE public.workout_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  set_number INTEGER NOT NULL,
  reps INTEGER NOT NULL,
  weight DECIMAL(5,2),
  rest_seconds INTEGER,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for exercises
CREATE POLICY "Users can view their own exercises" ON public.exercises FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own exercises" ON public.exercises FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own exercises" ON public.exercises FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own exercises" ON public.exercises FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for workout sessions
CREATE POLICY "Users can view their own workout sessions" ON public.workout_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own workout sessions" ON public.workout_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own workout sessions" ON public.workout_sessions FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own workout sessions" ON public.workout_sessions FOR DELETE USING (auth.uid() = user_id);

-- Create RLS policies for workout sets
CREATE POLICY "Users can view their own workout sets" ON public.workout_sets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own workout sets" ON public.workout_sets FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own workout sets" ON public.workout_sets FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own workout sets" ON public.workout_sets FOR DELETE USING (auth.uid() = user_id);

-- Add triggers for updated_at
CREATE TRIGGER update_exercises_updated_at
  BEFORE UPDATE ON public.exercises
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workout_sessions_updated_at
  BEFORE UPDATE ON public.workout_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert some common exercises
INSERT INTO public.exercises (user_id, name, muscle_group, description, is_custom) VALUES
  ('00000000-0000-0000-0000-000000000000', 'Bench Press', 'Chest', 'Classic chest exercise', false),
  ('00000000-0000-0000-0000-000000000000', 'Squat', 'Legs', 'Compound leg exercise', false),
  ('00000000-0000-0000-0000-000000000000', 'Deadlift', 'Back', 'Full body compound movement', false),
  ('00000000-0000-0000-0000-000000000000', 'Pull-ups', 'Back', 'Bodyweight back exercise', false),
  ('00000000-0000-0000-0000-000000000000', 'Overhead Press', 'Shoulders', 'Shoulder and core exercise', false),
  ('00000000-0000-0000-0000-000000000000', 'Barbell Row', 'Back', 'Compound back exercise', false),
  ('00000000-0000-0000-0000-000000000000', 'Dips', 'Chest', 'Bodyweight chest exercise', false),
  ('00000000-0000-0000-0000-000000000000', 'Bicep Curls', 'Arms', 'Isolation arm exercise', false);