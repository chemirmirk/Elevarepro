import { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Bot, User, Zap, Heart, Target } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type?: 'motivation' | 'advice' | 'crisis' | 'celebration';
}

const mockMessages: ChatMessage[] = [
  {
    id: '1',
    content: "Hello! I'm your personal motivation coach. I'm here to support you on your journey to build better habits. How are you feeling today?",
    sender: 'ai',
    timestamp: new Date(),
    type: 'motivation'
  }
];

const aiSuggestions = [
  "I'm struggling with motivation today",
  "How do I overcome cravings?",
  "What if I miss a day?",
  "I completed my goal!",
  "I'm feeling overwhelmed"
];

export const ChatPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (user) {
      loadChatHistory();
    }
  }, [user]);

  const loadChatHistory = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      const loadedMessages: ChatMessage[] = data.map(msg => ({
        id: msg.id,
        content: msg.content,
        sender: msg.sender as 'user' | 'ai',
        timestamp: new Date(msg.created_at),
        type: msg.message_type as ChatMessage['type']
      }));

      if (loadedMessages.length === 0) {
        setMessages(mockMessages);
        // Save the initial welcome message
        await supabase
          .from('chat_messages')
          .insert({
            user_id: user.id,
            content: mockMessages[0].content,
            sender: 'ai',
            message_type: 'motivation'
          });
      } else {
        setMessages(loadedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      setMessages(mockMessages);
    }
  };

  const saveMessage = async (message: ChatMessage) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: user.id,
          content: message.content,
          sender: message.sender,
          message_type: message.type || 'text'
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving message:', error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async (content: string) => {
    if (!content.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: content.trim(),
      sender: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);
    
    // Save user message
    await saveMessage(userMessage);

    try {
      // Call AI chat function
      const { data, error } = await supabase.functions.invoke('ai-chat', {
        body: { 
          message: content.trim(),
          chatHistory: messages 
        }
      });

      if (error) throw error;

      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        sender: 'ai',
        timestamp: new Date(),
        type: data.type as ChatMessage['type']
      };
      
      setMessages(prev => [...prev, aiMessage]);
      setIsTyping(false);
      
      // Save AI message
      await saveMessage(aiMessage);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setIsTyping(false);
      
      // Fallback to local response
      const fallbackResponse = generateAIResponse(content);
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: fallbackResponse.content,
        sender: 'ai',
        timestamp: new Date(),
        type: fallbackResponse.type
      };
      
      setMessages(prev => [...prev, aiMessage]);
      await saveMessage(aiMessage);
      
      toast.error("AI service temporarily unavailable");
    }
  };

  const generateAIResponse = (userMessage: string): { content: string; type: ChatMessage['type'] } => {
    const message = userMessage.toLowerCase();
    
    if (message.includes('struggling') || message.includes('motivation')) {
      return {
        content: "I understand that motivation can be challenging. Remember, motivation gets you started, but habit keeps you going. Even on tough days, doing something small counts as progress. What's one tiny step you could take right now?",
        type: 'motivation'
      };
    }
    
    if (message.includes('crav') || message.includes('tempt')) {
      return {
        content: "Cravings are temporary, but your goals are permanent. Try the 5-minute rule: when you feel a craving, wait 5 minutes and do something else. Often, the feeling will pass. Remember why you started this journey. What strategies have worked for you before?",
        type: 'advice'
      };
    }
    
    if (message.includes('complete') || message.includes('achieved') || message.includes('success')) {
      return {
        content: "That's fantastic! 🎉 Celebrating your wins is so important. Each success builds momentum for the next one. Take a moment to appreciate how far you've come. What felt particularly good about achieving this goal?",
        type: 'celebration'
      };
    }
    
    if (message.includes('miss') || message.includes('failed') || message.includes('mistake')) {
      return {
        content: "One missed day doesn't define your journey. Progress isn't about perfection—it's about consistency over time. What matters most is getting back on track today. Every expert was once a beginner who never gave up. How can you restart tomorrow?",
        type: 'motivation'
      };
    }
    
    if (message.includes('overwhelm') || message.includes('stressed') || message.includes('too much')) {
      return {
        content: "Feeling overwhelmed is completely normal. Let's break things down into smaller, manageable pieces. Focus on just one goal at a time. Remember: you don't have to be perfect, you just have to be persistent. What's the smallest step you can take today?",
        type: 'advice'
      };
    }
    
    return {
      content: "I'm here to support you every step of the way. Building new habits takes time and patience with yourself. Remember that every small action you take is moving you closer to your goals. What specific challenge would you like to talk about?",
      type: 'motivation'
    };
  };

  const messageTypeColors = {
    motivation: 'border-l-primary bg-primary/5',
    advice: 'border-l-secondary bg-secondary/5',
    crisis: 'border-l-warning bg-warning/5',
    celebration: 'border-l-success bg-success/5'
  };

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] max-w-md mx-auto bg-background">
      {/* Header */}
      <div className="p-4 border-b bg-card">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-1">AI Motivation Coach</h1>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
            <p className="text-sm text-muted-foreground">Online • Always here for you</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex items-start gap-3 ${
              message.sender === 'user' ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              message.sender === 'user' 
                ? 'bg-primary text-white' 
                : 'bg-secondary text-white'
            }`}>
              {message.sender === 'user' ? (
                <User className="h-4 w-4" />
              ) : (
                <Bot className="h-4 w-4" />
              )}
            </div>
            
            <div className={`flex-1 max-w-[80%] ${
              message.sender === 'user' ? 'text-right' : 'text-left'
            }`}>
              <div className={`p-3 rounded-lg ${
                message.sender === 'user'
                  ? 'bg-primary text-white ml-4'
                  : `bg-card border border-border mr-4 ${
                      message.type ? messageTypeColors[message.type] + ' border-l-4' : ''
                    }`
              }`}>
                <p className="text-sm">{message.content}</p>
                {message.type && message.sender === 'ai' && (
                  <div className="mt-2 flex items-center gap-1">
                    {message.type === 'motivation' && <Zap className="h-3 w-3 text-primary" />}
                    {message.type === 'celebration' && <Heart className="h-3 w-3 text-success" />}
                    {message.type === 'advice' && <Target className="h-3 w-3 text-secondary" />}
                    <Badge variant="outline" className="text-xs">
                      {message.type}
                    </Badge>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-1 px-3">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        
        {isTyping && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-secondary text-white flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div className="bg-card border border-border rounded-lg p-3 mr-4">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestions */}
      <div className="p-4 border-t bg-muted/30">
        <p className="text-xs text-muted-foreground mb-2">Quick suggestions:</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {aiSuggestions.map((suggestion, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => sendMessage(suggestion)}
              className="whitespace-nowrap text-xs h-8"
            >
              {suggestion}
            </Button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t bg-card flex-shrink-0">
        <div className="flex gap-2">
          <Input
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            placeholder="Type your message here..."
            className="flex-1"
            onKeyPress={(e) => e.key === 'Enter' && sendMessage(inputMessage)}
          />
          <Button
            onClick={() => sendMessage(inputMessage)}
            disabled={!inputMessage.trim() || isTyping}
            className="gradient-primary shadow-primary text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Share your thoughts, ask for advice, or get motivation support
        </p>
      </div>
    </div>
  );
};