import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpdateStreakRequest {
  userId: string;
  streakType: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { userId, streakType }: UpdateStreakRequest = await req.json();

    if (!userId || !streakType) {
      throw new Error("Missing required parameters: userId and streakType");
    }

    const today = new Date().toISOString().split('T')[0];
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().split('T')[0];

    // Get current streak data
    const { data: streakData, error: streakError } = await supabaseClient
      .from('streaks')
      .select('current_count, best_count, last_updated')
      .eq('user_id', userId)
      .eq('streak_type', streakType)
      .maybeSingle();

    if (streakError) {
      throw streakError;
    }

    let newCount = 1;
    let isPersonalBest = false;

    if (streakData) {
      const lastUpdated = streakData.last_updated;
      
      if (lastUpdated === today) {
        // Already updated today, no change needed
        return new Response(
          JSON.stringify({ 
            currentStreak: streakData.current_count,
            isPersonalBest: false,
            message: "Already updated today"
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }

      if (lastUpdated === yesterdayStr) {
        // Continuing streak
        newCount = streakData.current_count + 1;
      } else if (lastUpdated && lastUpdated < yesterdayStr) {
        // Missed day(s), reset streak
        console.log(`Streak reset for user ${userId}. Last updated: ${lastUpdated}, Yesterday: ${yesterdayStr}`);
        newCount = 1;
      }
      // If lastUpdated is null, it's the first check-in, so newCount = 1

      // Check if this is a personal best
      isPersonalBest = newCount > (streakData.best_count || 0);
    } else {
      // First time creating streak
      isPersonalBest = true;
    }

    // Update or insert streak data
    const { error: upsertError } = await supabaseClient
      .from('streaks')
      .upsert({
        user_id: userId,
        streak_type: streakType,
        current_count: newCount,
        best_count: Math.max(newCount, streakData?.best_count || 0),
        last_updated: today
      });

    if (upsertError) {
      throw upsertError;
    }

    console.log(`Streak updated for user ${userId}: ${newCount} days (Personal best: ${isPersonalBest})`);

    return new Response(
      JSON.stringify({ 
        currentStreak: newCount,
        isPersonalBest,
        bestStreak: Math.max(newCount, streakData?.best_count || 0)
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in update-streak function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);