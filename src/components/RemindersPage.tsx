import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Bell, Plus, Clock, Zap, Edit, Trash2, BrainCircuit } from "lucide-react";

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
  const [reminders, setReminders] = useState<Reminder[]>(mockReminders);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newReminder, setNewReminder] = useState({
    title: '',
    message: '',
    time: '',
    type: 'motivational' as Reminder['type']
  });

  const toggleReminder = (id: string) => {
    setReminders(prev => prev.map(reminder => 
      reminder.id === id ? { ...reminder, isActive: !reminder.isActive } : reminder
    ));
  };

  const deleteReminder = (id: string) => {
    setReminders(prev => prev.filter(reminder => reminder.id !== id));
  };

  const addReminder = () => {
    if (!newReminder.title.trim() || !newReminder.message.trim() || !newReminder.time) {
      return;
    }

    const reminder: Reminder = {
      id: Date.now().toString(),
      ...newReminder,
      isActive: true
    };

    setReminders(prev => [...prev, reminder].sort((a, b) => a.time.localeCompare(b.time)));
    setNewReminder({ title: '', message: '', time: '', type: 'motivational' });
    setShowAddForm(false);
  };

  const generateAIReminders = () => {
    // Simulate AI generation
    const aiReminder: Reminder = {
      id: Date.now().toString(),
      title: 'AI Smart Reminder',
      message: 'Based on your recent check-ins, you seem to struggle with afternoon motivation. Remember: every small step counts toward your bigger goal!',
      time: '15:30',
      isActive: true,
      type: 'motivational',
      isAiGenerated: true
    };
    
    setReminders(prev => [...prev, aiReminder].sort((a, b) => a.time.localeCompare(b.time)));
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