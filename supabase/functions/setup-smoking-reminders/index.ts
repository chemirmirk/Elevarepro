import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SmokingGoal {
  currentAmount: number;
  targetAmount: number;
  timeframe: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { userId, smokingGoal } = await req.json() as {
      userId: string;
      smokingGoal: SmokingGoal;
    };

    console.log('Setting up smoking reminders for user:', userId, smokingGoal);

    // Calculate reminder schedule based on timeframe
    const reminderSchedule = calculateReminderSchedule(smokingGoal.timeframe);
    const checkupSchedule = calculateCheckupSchedule(smokingGoal.timeframe);

    // Create daily motivation reminders
    const dailyReminders = [
      {
        user_id: userId,
        title: 'Stay Strong!',
        message: `You're reducing from ${smokingGoal.currentAmount} to ${smokingGoal.targetAmount}. Every day counts!`,
        time: '09:00:00',
        reminder_type: 'smoking_motivation',
        is_ai_generated: true,
        is_active: true
      },
      {
        user_id: userId,
        title: 'Craving Support',
        message: 'Feeling a craving? Try deep breathing, drink water, or take a walk instead.',
        time: '15:00:00',
        reminder_type: 'smoking_support',
        is_ai_generated: true,
        is_active: true
      },
      {
        user_id: userId,
        title: 'Evening Reflection',
        message: 'How did your smoking reduction go today? Remember your goals and celebrate small wins!',
        time: '20:00:00',
        reminder_type: 'smoking_reflection',
        is_ai_generated: true,
        is_active: true
      }
    ];

    // Create milestone reminders
    const milestoneReminders = reminderSchedule.map((milestone, index) => ({
      user_id: userId,
      title: `Milestone Check - ${milestone.title}`,
      message: milestone.message,
      time: '10:00:00',
      reminder_type: 'smoking_milestone',
      is_ai_generated: true,
      is_active: true
    }));

    // Create check-up reminders
    const checkupReminders = checkupSchedule.map(checkup => ({
      user_id: userId,
      title: `Progress Check-Up - ${checkup.title}`,
      message: checkup.message,
      time: '14:00:00',
      reminder_type: 'smoking_checkup',
      is_ai_generated: true,
      is_active: true
    }));

    // Insert all reminders
    const allReminders = [...dailyReminders, ...milestoneReminders, ...checkupReminders];
    
    const { data: reminderData, error: reminderError } = await supabaseClient
      .from('reminders')
      .insert(allReminders);

    if (reminderError) {
      console.error('Error creating reminders:', reminderError);
      throw reminderError;
    }

    // Create a specific smoking cessation goal in the goals table
    const { data: goalData, error: goalError } = await supabaseClient
      .from('goals')
      .insert({
        user_id: userId,
        goal_type: 'smoking_cessation',
        target_amount: smokingGoal.targetAmount,
        current_amount: smokingGoal.currentAmount,
        target_unit: 'cigarettes_per_day',
        is_active: true
      });

    if (goalError) {
      console.error('Error creating smoking goal:', goalError);
      throw goalError;
    }

    console.log('Successfully created smoking reminders and goal');

    return new Response(
      JSON.stringify({ 
        success: true, 
        remindersCreated: allReminders.length,
        goalCreated: true
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in setup-smoking-reminders function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});

function calculateReminderSchedule(timeframe: string) {
  const schedules = {
    '1-month': [
      { title: 'Week 1', message: 'You\'re 1 week into your smoking reduction journey! How are you feeling?' },
      { title: 'Week 2', message: 'Two weeks in! Your body is already starting to heal. Keep going!' },
      { title: 'Week 3', message: 'Three weeks of progress! You\'re building new healthy habits.' },
      { title: 'Month Complete', message: 'Congratulations! You\'ve completed your 1-month smoking reduction goal!' }
    ],
    '3-months': [
      { title: 'Month 1', message: 'One month down! Your lungs are already thanking you.' },
      { title: 'Month 2', message: 'Two months of progress! You\'re proving you can do this.' },
      { title: 'Month 3', message: 'Final month! You\'re so close to your 3-month goal!' }
    ],
    '6-months': [
      { title: 'Month 1', message: 'First month complete! The hardest part is behind you.' },
      { title: 'Month 3', message: 'Quarter way there! Your health improvements are accelerating.' },
      { title: 'Month 6', message: 'Six months! You\'ve made incredible progress on your journey.' }
    ],
    '1-year': [
      { title: 'Month 3', message: 'Three months in! You\'re building lasting change.' },
      { title: 'Month 6', message: 'Halfway there! Six months of healthier choices.' },
      { title: 'Month 9', message: 'Nine months of progress! You\'re in the home stretch.' },
      { title: 'Year Complete', message: 'One full year! You\'ve transformed your relationship with smoking!' }
    ]
  };

  return schedules[timeframe as keyof typeof schedules] || schedules['3-months'];
}

function calculateCheckupSchedule(timeframe: string) {
  const schedules = {
    '1-month': [
      { title: 'Week 2 Check', message: 'Time for a check-up! How many cigarettes are you down to? Any challenges to discuss?' },
      { title: 'Final Week', message: 'Final week check-up! You\'re almost at your goal. How are you feeling?' }
    ],
    '3-months': [
      { title: 'Month 1 Check', message: 'Monthly check-up time! Track your progress and celebrate your wins.' },
      { title: 'Month 2 Check', message: 'Two-month check-up! How close are you to your target?' },
      { title: 'Final Check', message: 'Final check-up! Time to celebrate your 3-month achievement!' }
    ],
    '6-months': [
      { title: 'Month 2 Check', message: 'Two-month check-up! How\'s your progress toward your 6-month goal?' },
      { title: 'Month 4 Check', message: 'Mid-journey check-up! You\'re doing great - keep going!' },
      { title: 'Final Check', message: 'Six-month check-up! Amazing progress on your smoking cessation journey!' }
    ],
    '1-year': [
      { title: 'Month 2 Check', message: 'Early check-up! How are your new habits forming?' },
      { title: 'Month 4 Check', message: 'Four-month check-up! You\'re building lasting change.' },
      { title: 'Month 8 Check', message: 'Eight-month check-up! You\'re so close to your year goal!' },
      { title: 'Final Check', message: 'One-year check-up! Celebrate this incredible milestone!' }
    ]
  };

  return schedules[timeframe as keyof typeof schedules] || schedules['3-months'];
}