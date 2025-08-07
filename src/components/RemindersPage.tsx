import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Clock, Zap, Edit, Trash2, BrainCircuit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface Reminder {
  id: string;
  title: string;
  message: string;
  time: string;
  isActive: boolean;
  type: 'motivational' | 'habit' | 'accountability' | 'celebration';
  isAiGenerated?: boolean;
}

const mockReminders: Reminder[] = [
  {
    id: '1',
    title: 'Morning Motivation',
    message: 'You are stronger than your excuses. Time to hit the gym! 💪',
    time: '07:00',
    isActive: true,
    type: 'motivational',
    isAiGenerated: true
  },
  {
    id: '2',
    title: 'Midday Check-in',
    message: 'How are you feeling? Remember your goals and stay focused.',
    time: '12:00',
    isActive: true,
    type: 'accountability'
  },
  {
    id: '3',
    title: 'Evening Reflection',
    message: 'Take a moment to reflect on today\'s progress. You\'ve got this!',
    time: '20:00',
    isActive: false,
    type: 'habit'
  },
  {
    id: '4',
    title: 'Weekly Victory',
    message: 'Congratulations on another smoke-free day! 🎉',
    time: '18:00',
    isActive: true,
    type: 'celebration',
    isAiGenerated: true
  }
];

const reminderTypes = {
  motivational: { label: 'Motivational', color: 'bg-primary/10 text-primary' },
  habit: { label: 'Habit Cue', color: 'bg-secondary/10 text-secondary' },
  accountability: { label: 'Check-in', color: 'bg-warning/10 text-warning' },
  celebration: { label: 'Celebration', color: 'bg-success/10 text-success' }
};

export const RemindersPage = () => {
  const { user } = useAuth();
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    message: '',
    time: '',
    type: 'motivational' as Reminder['type']
  });

  useEffect(() => {
    if (user) {
      loadReminders();
    }
  }, [user]);

  const loadReminders = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .eq('user_id', user.id)
        .order('time', { ascending: true });

      if (error) throw error;
      
      const loadedReminders: Reminder[] = data.map(reminder => ({
        id: reminder.id,
        title: reminder.title,
        message: reminder.message,
        time: reminder.time,
        isActive: reminder.is_active,
        type: reminder.reminder_type as Reminder['type'],
        isAiGenerated: reminder.is_ai_generated
      }));

      setReminders(loadedReminders);
    } catch (error) {
      console.error('Error loading reminders:', error);
    }
  };

  const toggleReminder = async (id: string) => {
    if (!user) return;
    
    const reminder = reminders.find(r => r.id === id);
    if (!reminder) return;
    
    try {
      const { error } = await supabase
        .from('reminders')
        .update({ is_active: !reminder.isActive })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setReminders(prev => prev.map(r => 
        r.id === id ? { ...r, isActive: !r.isActive } : r
      ));
      
      toast.success(`Reminder ${!reminder.isActive ? 'enabled' : 'disabled'}`);
    } catch (error) {
      console.error('Error toggling reminder:', error);
      toast.error("Failed to update reminder");
    }
  };

  const deleteReminder = async (id: string) => {
    if (!user) return;
    
    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;
      
      setReminders(prev => prev.filter(reminder => reminder.id !== id));
      toast.success("Reminder deleted");
    } catch (error) {
      console.error('Error deleting reminder:', error);
      toast.error("Failed to delete reminder");
    }
  };

  const addReminder = async () => {
    if (!newReminder.title.trim() || !newReminder.message.trim() || !newReminder.time || !user) {
      return;
    }

    try {
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          title: newReminder.title.trim(),
          message: newReminder.message.trim(),
          time: newReminder.time,
          reminder_type: newReminder.type,
          is_active: true,
          is_ai_generated: false
        })
        .select()
        .single();

      if (error) throw error;
      
      const reminder: Reminder = {
        id: data.id,
        title: data.title,
        message: data.message,
        time: data.time,
        isActive: data.is_active,
        type: data.reminder_type as Reminder['type'],
        isAiGenerated: data.is_ai_generated
      };

      setReminders(prev => [...prev, reminder].sort((a, b) => a.time.localeCompare(b.time)));
      setNewReminder({ title: '', message: '', time: '', type: 'motivational' });
      setShowAddForm(false);
      toast.success("Reminder created successfully!");
    } catch (error) {
      console.error('Error adding reminder:', error);
      toast.error("Failed to create reminder");
    }
  };

  const generateAIReminders = async () => {
    if (!user) return;
    
    try {
      // Simulate AI generation based on user data
      const aiReminder = {
        title: 'AI Smart Reminder',
        message: 'Based on your recent check-ins, you seem to struggle with afternoon motivation. Remember: every small step counts toward your bigger goal!',
        time: '15:30',
        type: 'motivational' as Reminder['type']
      };
      
      const { data, error } = await supabase
        .from('reminders')
        .insert({
          user_id: user.id,
          title: aiReminder.title,
          message: aiReminder.message,
          time: aiReminder.time,
          reminder_type: aiReminder.type,
          is_active: true,
          is_ai_generated: true
        })
        .select()
        .single();

      if (error) throw error;
      
      const reminder: Reminder = {
        id: data.id,
        title: data.title,
        message: data.message,
        time: data.time,
        isActive: data.is_active,
        type: data.reminder_type as Reminder['type'],
        isAiGenerated: data.is_ai_generated
      };
      
      setReminders(prev => [...prev, reminder].sort((a, b) => a.time.localeCompare(b.time)));
      toast.success("AI reminder generated successfully!");
    } catch (error) {
      console.error('Error generating AI reminder:', error);
      toast.error("Failed to generate AI reminder");
    }
  };

  const activeReminders = reminders.filter(r => r.isActive).length;

  return (
    <div className="p-4 pb-24 space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold mb-2">Smart Reminders</h1>
        <p className="text-muted-foreground">Stay motivated with personalized notifications</p>
      </div>

      {/* Stats Card */}
      <Card className="gradient-secondary text-white shadow-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <Bell className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm opacity-90">Active Reminders</p>
                <p className="text-xl font-bold">{activeReminders}</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30">
              Helping you succeed
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* AI Generation */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <BrainCircuit className="h-5 w-5 text-primary" />
            AI-Powered Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-4">
            Let AI analyze your check-in patterns and create personalized reminders to help you stay on track.
          </p>
          <Button 
            onClick={generateAIReminders}
            variant="outline" 
            className="w-full"
          >
            <Zap className="h-4 w-4 mr-2" />
            Generate Smart Reminders
          </Button>
        </CardContent>
      </Card>

      {/* Add New Reminder */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-success" />
              Add Custom Reminder
            </div>
            <Button
              onClick={() => setShowAddForm(!showAddForm)}
              variant="ghost"
              size="sm"
            >
              {showAddForm ? 'Cancel' : 'Add'}
            </Button>
          </CardTitle>
        </CardHeader>
        {showAddForm && (
          <CardContent className="space-y-4">
            <Input
              placeholder="Reminder title..."
              value={newReminder.title}
              onChange={(e) => setNewReminder(prev => ({ ...prev, title: e.target.value }))}
            />
            <Input
              placeholder="Reminder message..."
              value={newReminder.message}
              onChange={(e) => setNewReminder(prev => ({ ...prev, message: e.target.value }))}
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                type="time"
                value={newReminder.time}
                onChange={(e) => setNewReminder(prev => ({ ...prev, time: e.target.value }))}
              />
              <select 
                value={newReminder.type}
                onChange={(e) => setNewReminder(prev => ({ ...prev, type: e.target.value as Reminder['type'] }))}
                className="px-3 py-2 border border-border rounded-md bg-background"
              >
                {Object.entries(reminderTypes).map(([value, { label }]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
            <Button 
              onClick={addReminder}
              className="w-full gradient-primary shadow-primary text-white"
              disabled={!newReminder.title.trim() || !newReminder.message.trim() || !newReminder.time}
            >
              Create Reminder
            </Button>
          </CardContent>
        )}
      </Card>

      {/* Reminders List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">All Reminders</h3>
        {reminders.sort((a, b) => a.time.localeCompare(b.time)).map((reminder) => (
          <Card key={reminder.id} className={`shadow-card transition-all duration-200 ${reminder.isActive ? '' : 'opacity-60'}`}>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold">{reminder.title}</h4>
                      {reminder.isAiGenerated && (
                        <Badge variant="outline" className="text-xs">
                          <BrainCircuit className="h-3 w-3 mr-1" />
                          AI
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-2">
                      {reminder.message}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge className={reminderTypes[reminder.type].color}>
                        {reminderTypes[reminder.type].label}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {reminder.time}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <Switch
                      checked={reminder.isActive}
                      onCheckedChange={() => toggleReminder(reminder.id)}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button variant="ghost" size="sm">
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => deleteReminder(reminder.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {reminders.length === 0 && (
        <Card className="shadow-card">
          <CardContent className="p-8 text-center">
            <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-semibold mb-2">No reminders yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create your first reminder to stay motivated and on track with your goals.
            </p>
            <Button onClick={() => setShowAddForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Reminder
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};