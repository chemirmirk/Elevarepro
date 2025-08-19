import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface SendRemindersRequest {
  userId?: string; // Optional - if provided, only check this user
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

    const requestBody = await req.json().catch(() => ({}));
    const { userId } = requestBody as SendRemindersRequest;

    console.log(`Checking goal reminders${userId ? ` for user ${userId}` : ' for all users'}`);

    const today = new Date().toISOString().split('T')[0];
    const now = new Date().toISOString();

    // Build query for goals that need reminders
    let query = supabaseClient
      .from('goals')
      .select('id, user_id, goal_type, goal_description, target_amount, current_amount, target_unit, end_date, duration_days, reminder_frequency, last_reminder_sent')
      .eq('is_active', true)
      .not('end_date', 'is', null);

    // If userId provided, filter by that user
    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data: goals, error } = await query;

    if (error) throw error;

    const reminders = [];
    const updates = [];

    for (const goal of goals || []) {
      const shouldSendReminder = await checkIfReminderNeeded(goal, today);
      
      if (shouldSendReminder) {
        const reminderData = await generateReminderContent(goal, today);
        
        // Create reminder record
        const { error: reminderError } = await supabaseClient
          .from('reminders')
          .insert({
            user_id: goal.user_id,
            title: reminderData.title,
            message: reminderData.message,
            reminder_type: 'goal_progress',
            time: '09:00:00', // Default reminder time
            is_active: true,
            is_ai_generated: true
          });

        if (!reminderError) {
          reminders.push({
            userId: goal.user_id,
            goalId: goal.id,
            goalType: goal.goal_type,
            ...reminderData
          });

          // Update the last_reminder_sent timestamp
          updates.push(
            supabaseClient
              .from('goals')
              .update({ last_reminder_sent: now })
              .eq('id', goal.id)
          );
        }
      }
    }

    // Execute all updates in parallel
    if (updates.length > 0) {
      await Promise.all(updates);
    }

    console.log(`Created ${reminders.length} goal reminders`);

    return new Response(
      JSON.stringify({
        success: true,
        remindersCreated: reminders.length,
        reminders: reminders.slice(0, 5), // Return first 5 for logging
        totalGoalsChecked: goals?.length || 0
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error in goal-reminders function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function checkIfReminderNeeded(goal: any, today: string): Promise<boolean> {
  const now = new Date();
  const endDate = new Date(goal.end_date);
  const daysRemaining = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  
  // Don't send reminders for overdue goals (they get different notifications)
  if (daysRemaining < 0) return false;

  // Check when we last sent a reminder
  const lastReminder = goal.last_reminder_sent;
  const frequency = goal.reminder_frequency || 'daily';
  
  if (lastReminder) {
    const lastReminderDate = new Date(lastReminder);
    const daysSinceLastReminder = Math.floor((now.getTime() - lastReminderDate.getTime()) / (1000 * 60 * 60 * 24));
    
    switch (frequency) {
      case 'daily':
        if (daysSinceLastReminder < 1) return false;
        break;
      case 'weekly':
        if (daysSinceLastReminder < 7) return false;
        break;
      case 'never':
        return false;
    }
  }

  // Send reminders based on urgency and progress
  const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
  const expectedProgress = goal.duration_days ? 
    ((goal.duration_days - daysRemaining) / goal.duration_days) * 100 : 0;

  // Always remind if goal is due within 3 days
  if (daysRemaining <= 3) return true;
  
  // Remind if significantly behind schedule (20% or more)
  if (progressPercentage < expectedProgress - 20) return true;
  
  // Daily check-in for active goals (but not too frequently)
  if (frequency === 'daily' && daysRemaining <= 7) return true;
  
  // Weekly check-in for longer-term goals
  if (frequency === 'weekly' || (frequency === 'daily' && daysRemaining > 7)) {
    const dayOfWeek = now.getDay();
    // Send weekly reminders on Sundays (0) or Mondays (1)
    return dayOfWeek <= 1;
  }

  return false;
}

async function generateReminderContent(goal: any, today: string): Promise<{title: string, message: string, urgency: string}> {
  const endDate = new Date(goal.end_date);
  const daysRemaining = Math.ceil((endDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
  
  let title = "";
  let message = "";
  let urgency = "normal";

  const goalName = goal.goal_description || goal.goal_type.replace('_', ' ');

  if (daysRemaining <= 0) {
    urgency = "high";
    title = `⏰ Goal Deadline Today!`;
    message = `Your goal "${goalName}" is due today! You're at ${progressPercentage.toFixed(1)}% completion. Every bit of progress counts!`;
  } else if (daysRemaining === 1) {
    urgency = "high";
    title = `🚨 Final Day for Your Goal`;
    message = `Tomorrow is the deadline for "${goalName}". You're at ${progressPercentage.toFixed(1)}% - make today count!`;
  } else if (daysRemaining <= 3) {
    urgency = "medium";
    title = `⏳ ${daysRemaining} Days Left`;
    message = `Only ${daysRemaining} days remaining for "${goalName}". Current progress: ${progressPercentage.toFixed(1)}%. You've got this!`;
  } else if (progressPercentage < 25 && daysRemaining <= 7) {
    urgency = "medium";
    title = `📈 Let's Build Momentum`;
    message = `Your goal "${goalName}" needs some attention. ${daysRemaining} days left, ${progressPercentage.toFixed(1)}% complete. Small steps lead to big wins!`;
  } else if (progressPercentage >= 75) {
    urgency = "low";
    title = `🎯 Almost There!`;
    message = `Amazing progress on "${goalName}"! You're ${progressPercentage.toFixed(1)}% complete with ${daysRemaining} days to go. The finish line is in sight!`;
  } else {
    urgency = "normal";
    title = `💪 Keep Going Strong`;
    message = `You're making steady progress on "${goalName}" - ${progressPercentage.toFixed(1)}% complete. ${daysRemaining} days remaining. Consistency is key!`;
  }

  return { title, message, urgency };
}

serve(handler);