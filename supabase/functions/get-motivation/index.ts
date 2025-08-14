import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { userName, goal, streak, challenge, userMessage } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const prompt = `The user's name is ${userName}.
Goal: ${goal}.
Streak day: ${streak}.
Biggest challenge: ${challenge}.
Today they said: "${userMessage}".
Provide a short, supportive, and motivational reply.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are a compassionate and motivating coach. Provide short, personalized, and encouraging responses that acknowledge the user\'s progress and challenges. Keep responses under 3 sentences and focus on actionable motivation.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('OpenAI API error:', errorData);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const motivationText = data.choices[0].message.content;

    return new Response(JSON.stringify({ 
      motivation: motivationText 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in get-motivation function:', error);
    
    // Fallback motivation message
    const fallbackMessage = "Keep going! You're doing great and every step forward counts. Your commitment to your goals is inspiring!";
    
    return new Response(JSON.stringify({ 
      motivation: fallbackMessage,
      error: 'Using fallback motivation'
    }), {
      status: 200, // Return 200 so the app can still function
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});