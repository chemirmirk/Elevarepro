
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
    console.log('AI chat function invoked');
    
    if (!openAIApiKey) {
      console.error('OpenAI API key not configured');
      throw new Error('OpenAI API key not configured');
    }

    const { message, userContext } = await req.json();
    
    if (!message) {
      throw new Error('Message is required');
    }

    console.log('Processing message:', message);
    console.log('User context:', userContext);
    
    // Initialize Supabase client with anon key for client operations
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            authorization: authHeader ?? '',
          },
        },
      }
    );

    // Get current user - the client will handle JWT validation
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      console.error('User authentication error:', userError);
      throw new Error('User not authenticated');
    }

    console.log('Authenticated user:', user.id);

    // Get or create today's thread
    const today = new Date().toISOString().split('T')[0];
    
    let threadId = null;
    const { data: existingThread, error: threadError } = await supabase
      .from('conversation_threads')
      .select('thread_id')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    if (threadError && threadError.code !== 'PGRST116') {
      console.error('Error fetching thread:', threadError);
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

    // Get today's check-in for specific context
    const { data: todayCheckIn } = await supabase
      .from('check_ins')
      .select('mood, goals_achieved, challenges')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

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

    const isNewDay = !existingThread;
    console.log('Is new day conversation:', isNewDay);

    // Build fresh context for each message
    const contextParts = [];
    contextParts.push(`Name: ${userContext?.name || 'User'}`);
    contextParts.push(`Current streak: ${userContext?.streak || 0} days`);
    
    if (userContext?.goals) {
      contextParts.push(`Goals: ${Array.isArray(userContext.goals) ? userContext.goals.join(', ') : userContext.goals}`);
    }
    
    if (userContext?.challenges) {
      contextParts.push(`Challenges: ${Array.isArray(userContext.challenges) ? userContext.challenges.join(', ') : userContext.challenges}`);
    }

    contextParts.push(`7-Day Mood Trend: ${moodTrend.join(' | ')}`);
    
    if (todayCheckIn) {
      const todayMoodEmoji = moodEmojis.find(m => m.value === todayCheckIn.mood);
      contextParts.push(`Today's Check-in: Mood ${todayMoodEmoji?.emoji} (${todayMoodEmoji?.label})`);
      if (todayCheckIn.goals_achieved) contextParts.push(`Goals achieved: ${todayCheckIn.goals_achieved}`);
      if (todayCheckIn.challenges) contextParts.push(`Today's challenges: ${todayCheckIn.challenges}`);
    }

    const freshContext = contextParts.join(' | ');

    // Enhanced system prompt with non-repetitive instructions
    const systemPrompt = `You are Pursivo, a compassionate AI coach specializing in personal growth and habit formation. You help people build better habits and overcome challenges.

FRESH CONTEXT: ${freshContext}

CRITICAL INSTRUCTIONS FOR NON-REPETITIVE RESPONSES:
- NEVER reuse the same opening phrases or identical advice within 48 hours
- ALWAYS reference at least one concrete detail from today's check-in or mood trend  
- Vary your response style: sometimes motivational, sometimes practical, sometimes celebratory
- If this is a new day (${isNewDay}), start with a warm, unique greeting
- Keep responses conversational and personalized (2-4 sentences max)
- Focus on their specific situation and recent patterns

${isNewDay ? 'NEW DAY: Start with a fresh, warm greeting and acknowledge the new day naturally.' : 'CONTINUING CONVERSATION: Build on previous context while staying fresh and engaging.'}

Your personality: Warm, encouraging, realistic about ups and downs, celebrates small wins, provides actionable advice tailored to their specific goals and challenges.`;

    // If new day, create thread via OpenAI, otherwise use existing
    if (isNewDay && !threadId) {
      console.log('Creating new thread for new day');
      const threadResponse = await fetch('https://api.openai.com/v1/threads', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({})
      });

      if (!threadResponse.ok) {
        console.error('Failed to create thread, using direct chat');
        threadId = null;
      } else {
        const threadData = await threadResponse.json();
        threadId = threadData.id;
        
        // Save thread to database
        await supabase
          .from('conversation_threads')
          .insert({
            user_id: user.id,
            thread_id: threadId,
            date: today
          });
      }
    } else if (existingThread) {
      threadId = existingThread.thread_id;
      console.log('Using existing thread:', threadId);
    }

    let aiResponse;

    if (threadId) {
      // Use thread-based conversation
      console.log('Using thread-based conversation');
      
      // Add message to thread
      await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          role: 'user',
          content: `${systemPrompt}\n\nUser message: ${message}`
        })
      });

      // Create run
      const runResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
          'OpenAI-Beta': 'assistants=v2'
        },
        body: JSON.stringify({
          model: 'gpt-5-2025-08-07',
          max_completion_tokens: 200,
          temperature: 0.7,
          frequency_penalty: 0.6,
          presence_penalty: 0.3
        })
      });

      const runData = await runResponse.json();
      let runStatus = runData.status;
      
      // Poll for completion
      while (runStatus === 'in_progress' || runStatus === 'queued') {
        await new Promise(resolve => setTimeout(resolve, 1000));
        const statusResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/runs/${runData.id}`, {
          headers: {
            'Authorization': `Bearer ${openAIApiKey}`,
            'OpenAI-Beta': 'assistants=v2'
          }
        });
        const statusData = await statusResponse.json();
        runStatus = statusData.status;
      }

      // Get messages
      const messagesResponse = await fetch(`https://api.openai.com/v1/threads/${threadId}/messages`, {
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'OpenAI-Beta': 'assistants=v2'
        }
      });
      
      const messagesData = await messagesResponse.json();
      aiResponse = messagesData.data[0]?.content[0]?.text?.value || 'I apologize, I encountered an issue generating a response.';
      
    } else {
      // Fallback to direct chat completion
      console.log('Using fallback chat completion');
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-5-2025-08-07',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
          max_completion_tokens: 200,
          temperature: 0.7,
          frequency_penalty: 0.6,
          presence_penalty: 0.3
        }),
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('OpenAI API error:', errorData);
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      aiResponse = data.choices[0].message.content;
    }

    console.log('Generated AI response:', aiResponse);

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
