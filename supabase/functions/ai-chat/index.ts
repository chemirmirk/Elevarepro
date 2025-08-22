import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message, chatHistory, userContext } = await req.json();
    
    // Initialize Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            authorization: req.headers.get('authorization') ?? '',
          },
        },
      }
    );

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      throw new Error('User not authenticated');
    }

    // Fetch 7-day mood trend data
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 6);
    
    const { data: moodData, error: moodError } = await supabase
      .from('check_ins')
      .select('date, mood')
      .eq('user_id', user.id)
      .gte('date', sevenDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: true });

    if (moodError) {
      console.error('Error fetching mood data:', moodError);
    }

    // Create 7-day mood trend with day names and emojis
    const moodEmojis = [
      { value: 1, emoji: "😞", label: "Very Bad" },
      { value: 2, emoji: "🙁", label: "Bad" },
      { value: 3, emoji: "😐", label: "Okay" },
      { value: 4, emoji: "🙂", label: "Good" },
      { value: 5, emoji: "😀", label: "Great" },
    ];

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const moodTrend = [];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dayName = dayNames[date.getDay()];
      const dateStr = date.toISOString().split('T')[0];
      
      const dayMood = moodData?.find(m => m.date === dateStr);
      if (dayMood && dayMood.mood) {
        const moodEmoji = moodEmojis.find(m => m.value === dayMood.mood);
        moodTrend.push(`${dayName}: ${moodEmoji?.emoji} (${moodEmoji?.label})`);
      } else {
        moodTrend.push(`${dayName}: No check-in`);
      }
    }

    const moodTrendContext = moodTrend.length > 0 
      ? `\n\n**USER'S 7-DAY MOOD TREND:**\n${moodTrend.join('\n')}\n\nAnalyze their mood pattern. Acknowledge any improvements, address concerning dips, and provide personalized encouragement based on their emotional journey. If you see positive trends, celebrate them! If you notice struggles, offer specific support and remind them that ups and downs are normal parts of growth.`
      : '';

    // Check if this is a new day conversation
    const today = new Date().toISOString().split('T')[0];
    const todayMessages = chatHistory.filter((msg: any) => {
      const msgDate = new Date(msg.timestamp || Date.now()).toISOString().split('T')[0];
      return msgDate === today;
    });
    
    const isNewDay = todayMessages.length === 0;
    console.log('Is new day conversation:', isNewDay, 'Today messages count:', todayMessages.length);

    // Enhanced system prompt with mood context and day-based logic
    let systemPrompt = `You are Pursivo, a compassionate and motivating AI coach specialized in helping people build better habits and overcome challenges like quitting smoking, exercising regularly, or improving their daily routines.${userContext?.name ? ` You're speaking with ${userContext.name}.` : ''}

Your responses should be:
- Empathetic and understanding of their emotional journey
- Practical and actionable with specific strategies
- Encouraging but realistic about the ups and downs of growth
- Personalized based on their mood trends and situation
- Brief but meaningful (2-4 sentences)
- Focused on progress over perfection

${userContext?.streak ? `Current streak: ${userContext.streak} days` : ''}
${userContext?.goals ? `Current goals: ${Array.isArray(userContext.goals) ? userContext.goals.join(', ') : userContext.goals}` : ''}
${userContext?.challenges ? `Main challenges: ${Array.isArray(userContext.challenges) ? userContext.challenges.join(', ') : userContext.challenges}` : ''}${moodTrendContext}

${isNewDay ? 'IMPORTANT: This is the start of a new day conversation. Begin your response with a warm greeting like "Good morning!" or "Hey, good morning!" and acknowledge the new day before addressing their message. Keep it natural and friendly.' : 'Continue the ongoing conversation from today, maintaining context from your previous interactions.'}

When users share struggles, provide specific strategies. When they share wins, celebrate with them. Always connect your response to their recent mood patterns when relevant.`;

    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    console.log('Processing AI chat request for user:', user.id);
    console.log('Mood trend context:', moodTrendContext ? 'Available' : 'Not available');

    // Build messages array with day-filtered chat history for context
    const contextMessages = isNewDay ? [] : todayMessages.slice(-8); // Use only today's messages for context
    
    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      // Add today's chat history for context (maintaining conversation flow)
      ...contextMessages.map((msg: any) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.content
      })),
      {
        role: 'user',
        content: message
      }
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: messages,
        max_tokens: 200,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Determine message type based on content
    let messageType = 'motivation';
    const content = aiResponse.toLowerCase();
    
    if (content.includes('congratulations') || content.includes('great job') || content.includes('celebrate')) {
      messageType = 'celebration';
    } else if (content.includes('try') || content.includes('strategy') || content.includes('suggestion')) {
      messageType = 'advice';
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      type: messageType 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate AI response',
      details: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});