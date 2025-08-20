import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.53.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface UpdateGoalProgressRequest {
  userId: string;
  goalId: string;
  progressAmount: number;
  notes?: string;
}

interface CheckGoalDeadlinesRequest {
  userId: string;
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

    const { action, ...requestData } = await req.json();

    if (action === "updateProgress") {
      return await handleUpdateProgress(supabaseClient, requestData as UpdateGoalProgressRequest);
    } else if (action === "checkDeadlines") {
      return await handleCheckDeadlines(supabaseClient, requestData as CheckGoalDeadlinesRequest);
    } else if (action === "getDashboardData") {
      return await handleGetDashboardData(supabaseClient, requestData as { userId: string });
    } else {
      throw new Error("Invalid action specified");
    }

  } catch (error: any) {
    console.error("Error in goal-progress-tracker function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

async function handleUpdateProgress(
  supabaseClient: any, 
  { userId, goalId, progressAmount, notes }: UpdateGoalProgressRequest
): Promise<Response> {
  console.log('handleUpdateProgress called with:', { userId, goalId, progressAmount, notes });
  
  if (!userId || !goalId || progressAmount === undefined) {
    console.error('Missing required parameters:', { userId, goalId, progressAmount });
    throw new Error("Missing required parameters: userId, goalId, and progressAmount");
  }

  const today = new Date().toISOString().split('T')[0];
  console.log('Processing for date:', today);

  // Record daily progress
  const { data: upsertData, error: progressError } = await supabaseClient
    .from('goal_progress')
    .upsert({
      goal_id: goalId,
      user_id: userId,
      progress_amount: progressAmount,
      notes: notes || null,
      recorded_date: today
    }, {
      onConflict: 'goal_id,recorded_date'
    })
    .select();

  if (progressError) {
    console.error('Error upserting goal progress:', progressError);
    throw progressError;
  }
  
  console.log('Upserted goal progress:', upsertData);

  // Update goal's current_amount with total progress
  const { data: progressData, error: sumError } = await supabaseClient
    .from('goal_progress')
    .select('progress_amount')
    .eq('goal_id', goalId)
    .eq('user_id', userId);

  if (sumError) {
    console.error('Error fetching progress data for sum calculation:', sumError);
    throw sumError;
  }

  const totalProgress = progressData?.reduce((sum: number, record: any) => sum + record.progress_amount, 0) || 0;
  console.log('Calculated total progress:', totalProgress, 'from records:', progressData);

  const { data: updateData, error: updateError } = await supabaseClient
    .from('goals')
    .update({ current_amount: totalProgress })
    .eq('id', goalId)
    .eq('user_id', userId)
    .select();

  if (updateError) {
    console.error('Error updating goal current_amount:', updateError);
    throw updateError;
  }
  
  console.log('Updated goal current_amount:', updateData);

  // Check if goal is completed
  const { data: goalData, error: goalError } = await supabaseClient
    .from('goals')
    .select('target_amount, goal_type, goal_description')
    .eq('id', goalId)
    .single();

  if (goalError) throw goalError;

  const isCompleted = totalProgress >= goalData.target_amount;
  let message = `Progress updated! Total: ${totalProgress}/${goalData.target_amount}`;
  
  if (isCompleted) {
    message = `🎉 Congratulations! You've completed your ${goalData.goal_type} goal!`;
    
    // Mark goal as completed by setting is_active to false
    await supabaseClient
      .from('goals')
      .update({ is_active: false })
      .eq('id', goalId);
  }

  return new Response(
    JSON.stringify({ 
      success: true,
      totalProgress,
      isCompleted,
      message
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
}

async function handleCheckDeadlines(
  supabaseClient: any,
  { userId }: CheckGoalDeadlinesRequest
): Promise<Response> {
  if (!userId) {
    throw new Error("Missing required parameter: userId");
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Get goals that are due soon or overdue
  const { data: goals, error } = await supabaseClient
    .from('goals')
    .select('id, goal_type, goal_description, end_date, target_amount, current_amount, duration_days')
    .eq('user_id', userId)
    .eq('is_active', true)
    .not('end_date', 'is', null);

  if (error) throw error;

  const notifications = [];
  
  for (const goal of goals) {
    const endDate = new Date(goal.end_date);
    const todayDate = new Date(today);
    const daysRemaining = Math.ceil((endDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24));
    
    const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
    const expectedProgress = ((goal.duration_days - daysRemaining) / goal.duration_days) * 100;
    
    let notificationType = null;
    let message = "";
    
    if (daysRemaining <= 0) {
      notificationType = "overdue";
      message = `Your ${goal.goal_type} goal is overdue! You achieved ${progressPercentage.toFixed(1)}% of your target.`;
    } else if (daysRemaining <= 3) {
      notificationType = "urgent";
      message = `Only ${daysRemaining} day(s) left for your ${goal.goal_type} goal! You're at ${progressPercentage.toFixed(1)}% completion.`;
    } else if (progressPercentage < expectedProgress - 20) {
      notificationType = "behind";
      message = `You're behind on your ${goal.goal_type} goal. Expected: ${expectedProgress.toFixed(1)}%, Actual: ${progressPercentage.toFixed(1)}%`;
    } else if (progressPercentage > expectedProgress + 10) {
      notificationType = "ahead";
      message = `Great job! You're ahead on your ${goal.goal_type} goal! ${progressPercentage.toFixed(1)}% complete.`;
    }
    
    if (notificationType) {
      notifications.push({
        goalId: goal.id,
        goalType: goal.goal_type,
        type: notificationType,
        message,
        daysRemaining,
        progressPercentage: progressPercentage.toFixed(1)
      });
    }
  }

  return new Response(
    JSON.stringify({ 
      notifications,
      totalGoals: goals.length
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
}

async function handleGetDashboardData(
  supabaseClient: any,
  { userId }: { userId: string }
): Promise<Response> {
  if (!userId) {
    throw new Error("Missing required parameter: userId");
  }

  const today = new Date().toISOString().split('T')[0];
  
  // Get active goals with progress
  const { data: goals, error: goalsError } = await supabaseClient
    .from('goals')
    .select(`
      *,
      goal_progress!inner(
        progress_amount,
        recorded_date
      )
    `)
    .eq('user_id', userId)
    .eq('is_active', true);

  if (goalsError) throw goalsError;

  // Calculate progress stats for each goal
  const goalStats = goals?.map((goal: any) => {
    const daysRemaining = goal.end_date ? 
      Math.ceil((new Date(goal.end_date).getTime() - new Date(today).getTime()) / (1000 * 60 * 60 * 24)) : null;
    
    const progressPercentage = (goal.current_amount / goal.target_amount) * 100;
    
    return {
      id: goal.id,
      goalType: goal.goal_type,
      description: goal.goal_description,
      progress: goal.current_amount,
      target: goal.target_amount,
      progressPercentage: Math.min(progressPercentage, 100),
      daysRemaining,
      isOverdue: daysRemaining !== null && daysRemaining < 0,
      unit: goal.target_unit
    };
  }) || [];

  return new Response(
    JSON.stringify({ 
      goals: goalStats,
      totalActiveGoals: goalStats.length,
      completedGoals: goalStats.filter((g: any) => g.progressPercentage >= 100).length,
      overdueGoals: goalStats.filter((g: any) => g.isOverdue).length
    }),
    {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    }
  );
}

serve(handler);