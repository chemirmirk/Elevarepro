-- First, drop the existing trigger if it exists to recreate it properly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create the trigger to call our function when a user is created
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();