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
    const { message, chatHistory } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Build messages array with chat history
    const messages = [
      {
        role: 'system',
        content: `You are a compassionate and motivating AI coach specialized in helping people build better habits and overcome challenges like quitting smoking, exercising regularly, or improving their daily routines. 

Your responses should be:
- Empathetic and understanding
- Practical and actionable
- Encouraging but realistic
- Personalized based on their situation
- Brief but meaningful (2-4 sentences)

When users share struggles, provide specific strategies. When they share wins, celebrate with them. Always focus on progress over perfection.`
      },
      // Add recent chat history (last 10 messages)
      ...chatHistory.slice(-10).map((msg: any) => ({
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