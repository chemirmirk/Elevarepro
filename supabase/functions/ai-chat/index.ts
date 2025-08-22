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
        response: 'I apologize, but the AI service is not properly configured. Please try again later.',
        type: 'motivation'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { message, userContext } = await req.json();
    
    if (!message) {
      return new Response(JSON.stringify({ 
        response: 'I didn\'t receive your message. Could you please try sending it again?',
        type: 'motivation'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Processing message:', message);
    
    // Extract and validate JWT token
    const authHeader = req.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);
    
    if (!authHeader) {
      console.error('Missing authorization header');
      return new Response(JSON.stringify({ 
        response: 'I\'m having trouble authenticating your request. Please try refreshing the page and signing in again.',
        type: 'motivation'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    
    // Initialize Supabase client
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
        response: 'Your session has expired. Please refresh the page and sign in again to continue our conversation.',
        type: 'motivation'
      }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Authenticated user:', user.id);

    // Get basic user data
    const { data: profile } = await supabase
      .from('profiles')
      .select('name')
      .eq('user_id', user.id)
      .single();

    const { data: streakData } = await supabase
      .from('streaks')
      .select('current_count')
      .eq('user_id', user.id)
      .eq('streak_type', 'daily_checkin')
      .single();

    const today = new Date().toISOString().split('T')[0];
    const { data: todayCheckIn } = await supabase
      .from('check_ins')
      .select('mood, goals_achieved, challenges')
      .eq('user_id', user.id)
      .eq('date', today)
      .single();

    // Build simple context
    let contextString = `User: ${profile?.name || userContext?.name || 'User'}`;
    contextString += `, Streak: ${streakData?.current_count || userContext?.streak || 0} days`;
    
    if (userContext?.goals) {
      if (typeof userContext.goals === 'object') {
        const goals = Object.entries(userContext.goals).map(([key, value]) => {
          if (key === 'gym' && value.frequency) return `gym ${value.frequency}x/week`;
          if (key === 'smoking') return 'quit smoking';
          return key;
        }).join(', ');
        if (goals) contextString += `, Goals: ${goals}`;
      }
    }
    
    if (userContext?.challenges?.length > 0) {
      contextString += `, Challenges: ${userContext.challenges.join(', ')}`;
    }

    if (todayCheckIn?.mood) {
      const moodLabels = { 1: 'very sad', 2: 'sad', 3: 'neutral', 4: 'happy', 5: 'very happy' };
      contextString += `, Today's mood: ${moodLabels[todayCheckIn.mood]}`;
    }

    console.log('User context:', contextString);

    // Simple system prompt
    const systemPrompt = `You are Pursivo, a friendly personal growth coach. Be conversational, supportive, and reference their specific situation. Keep responses 2-3 sentences. If asked your name, simply say "My name is Pursivo."

Context: ${contextString}`;

    // Use simple chat completion
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 150,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    console.log('Generated AI response:', aiResponse);

    // Determine message type
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
    
    let fallbackResponse = 'I apologize, but I\'m having trouble processing your request right now. Please try again in a moment.';
    let messageType = 'motivation';
    
    if (error.message?.includes('OpenAI')) {
      fallbackResponse = 'I\'m having trouble connecting to my AI service right now. But I\'m still here to support you! Remember, every small step counts toward your goals.';
    } else if (error.message?.includes('auth')) {
      fallbackResponse = 'I\'m having authentication issues. Please try refreshing the page. In the meantime, remember that consistency is key to building lasting habits!';
    }
    
    return new Response(JSON.stringify({ 
      response: fallbackResponse,
      type: messageType
    }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
