
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
      return new Response(JSON.stringify({ 
        error: 'OpenAI API key not configured',
        response: 'I apologize, but the AI service is not properly configured. Please try again later.',
        type: 'motivation'
      }), {
        status: 200, // Return 200 to prevent client errors
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, userContext } = await req.json();
    
    if (!message) {
      return new Response(JSON.stringify({ 
        error: 'Message is required',
        response: 'I didn\'t receive your message. Could you please try sending it again?',
        type: 'motivation'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing message:', message);
    console.log('User context:', userContext);
    
    // Extract and validate JWT token using anon key client
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(JSON.stringify({ 
        error: 'Missing authorization header',
        response: 'I\'m having trouble authenticating your request. Please try refreshing the page and signing in again.',
        type: 'motivation'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Initialize Supabase client with service role key for admin operations
    const supabase = createClient(
      'https://kftwjrlcanttwnsdmgqv.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // Extract JWT token from authorization header
    const token = authHeader.replace('Bearer ', '');
    
    // Verify JWT token and get user
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) {
      console.error('User authentication error:', userError);
      return new Response(JSON.stringify({ 
        error: 'Invalid or expired token',
        response: 'Your session has expired. Please refresh the page and sign in again to continue our conversation.',
        type: 'motivation'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

    // Build user context in readable format
    const contextParts = [];
    
    // Basic info
    contextParts.push(`User: ${userContext?.name || 'User'}`);
    contextParts.push(`Current streak: ${userContext?.streak || 0} days`);
    
    // Format goals naturally
    if (userContext?.goals) {
      let goalsText = '';
      if (typeof userContext.goals === 'object' && !Array.isArray(userContext.goals)) {
        const goalsList = [];
        Object.entries(userContext.goals).forEach(([key, value]) => {
          if (typeof value === 'object') {
            if (key === 'gym' && value.frequency) {
              goalsList.push(`go to gym ${value.frequency} times per week`);
            } else if (key === 'smoking' && value.currentAmount && value.targetAmount) {
              goalsList.push(`reduce smoking from ${value.currentAmount} to ${value.targetAmount} cigarettes per day`);
            }
          }
        });
        goalsText = goalsList.join(', ');
      } else if (Array.isArray(userContext.goals)) {
        goalsText = userContext.goals.join(', ');
      } else {
        goalsText = String(userContext.goals);
      }
      if (goalsText) contextParts.push(`Goals: ${goalsText}`);
    }
    
    // Format challenges
    if (userContext?.challenges && userContext.challenges.length > 0) {
      contextParts.push(`Current challenges: ${userContext.challenges.join(', ')}`);
    }

    // Add mood trend
    contextParts.push(`7-day mood trend: ${moodTrend.join(', ')}`);
    
    // Add today's check-in if available
    if (todayCheckIn) {
      const todayMoodEmoji = moodEmojis.find(m => m.value === todayCheckIn.mood);
      contextParts.push(`Today's mood: ${todayMoodEmoji?.emoji} ${todayMoodEmoji?.label}`);
      if (todayCheckIn.goals_achieved) contextParts.push(`Goals achieved today: ${todayCheckIn.goals_achieved}`);
      if (todayCheckIn.challenges) contextParts.push(`Today's challenges: ${todayCheckIn.challenges}`);
    }

    const userContextText = contextParts.join('\n');

    // Clean system prompt - separate from user context
    const systemPrompt = `You are Pursivo, a compassionate AI personal growth coach. You help people build better habits and overcome challenges.

PERSONALITY:
- Warm, encouraging, and realistic about ups and downs
- Celebrate small wins and provide actionable advice
- Keep responses conversational and personalized (2-4 sentences max)
- Reference specific details from their situation when relevant

RESPONSE GUIDELINES:
- If asked "What is your name?" or similar, simply respond: "My name is Pursivo" with a friendly addition if appropriate
- ${isNewDay ? 'This is a new day - start with a warm, unique greeting' : 'Continue the conversation naturally, building on previous context'}
- Always reference concrete details from their mood trend, goals, or check-ins when relevant
- Vary your response style: motivational, practical, or celebratory as appropriate
- Never repeat identical phrases or advice from recent conversations

CURRENT USER CONTEXT:
${userContextText}`;

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
          content: message
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
          frequency_penalty: 0.6,
          presence_penalty: 0.3,
          instructions: systemPrompt
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
    
    // Return graceful error response instead of 500
    let fallbackResponse = 'I apologize, but I\'m having trouble processing your request right now. Please try again in a moment.';
    let messageType = 'motivation';
    
    // Provide specific fallback based on error type
    if (error.message?.includes('OpenAI')) {
      fallbackResponse = 'I\'m having trouble connecting to my AI service right now. But I\'m still here to support you! Remember, every small step counts toward your goals.';
    } else if (error.message?.includes('auth')) {
      fallbackResponse = 'I\'m having authentication issues. Please try refreshing the page. In the meantime, remember that consistency is key to building lasting habits!';
    }
    
    return new Response(JSON.stringify({ 
      response: fallbackResponse,
      type: messageType
    }), {
      status: 200, // Return 200 with fallback response
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
