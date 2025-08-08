import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Plus, CheckCircle, Clock, Target, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface ScheduledActivity {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'gym' | 'meditation' | 'milestone' | 'other';
  isCompleted: boolean;
  isRecurring: boolean;
}

const activityTypes = {
  gym: { label: 'Gym', color: 'bg-primary/10 text-primary', icon: '🏋️' },
  meditation: { label: 'Meditation', color: 'bg-secondary/10 text-secondary', icon: '🧘' },
  milestone: { label: 'Milestone', color: 'bg-warning/10 text-warning', icon: '🎯' },
  other: { label: 'Other', color: 'bg-muted/10 text-muted-foreground', icon: '📅' }
};

export const CalendarPage = () => {
  const { user } = useAuth();
  const [activities, setActivities] = useState<ScheduledActivity[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [weeklyGoal, setWeeklyGoal] = useState(5);
  const [completedThisWeek, setCompletedThisWeek] = useState(0);

  useEffect(() => {
    if (user) {
      loadActivities();
      loadWeeklyProgress();
    }
  }, [user]);

  const loadActivities = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: true });

      if (error) throw error;
      
      setActivities(data?.map(activity => ({
        id: activity.id,
        title: activity.title,
        date: activity.date,
        time: activity.time || '00:00',
        type: activity.activity_type as 'gym' | 'meditation' | 'milestone' | 'other',
        isCompleted: activity.is_completed || false,
        isRecurring: activity.is_recurring || false
      })) || []);
    } catch (error) {
      console.error('Error loading activities:', error);
    }
  };

  const loadWeeklyProgress = async () => {
    if (!user) return;
    
    try {
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      
      const { data: weeklyData } = await supabase
        .from('activities')
        .select('id')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .gte('date', startOfWeek.toISOString().split('T')[0]);

      setCompletedThisWeek(weeklyData?.length || 0);

      // Load weekly goal
      const { data: goalData } = await supabase
        .from('goals')
        .select('target_amount')
        .eq('user_id', user.id)
        .eq('goal_type', 'weekly_exercise')
        .eq('is_active', true)
        .single();

      if (goalData?.target_amount) {
        setWeeklyGoal(goalData.target_amount);
      }
    } catch (error) {
      console.error('Error loading weekly progress:', error);
    }
  };
  
  const toggleActivity = async (id: string) => {
    const activity = activities.find(a => a.id === id);
    if (!activity) return;

    const newCompletionStatus = !activity.isCompleted;
    
    try {
      const { error } = await supabase
        .from('activities')
        .update({ is_completed: newCompletionStatus })
        .eq('id', id);

      if (error) throw error;

      setActivities(prev => prev.map(activity => 
        activity.id === id ? { ...activity, isCompleted: newCompletionStatus } : activity
      ));

      // Reload weekly progress
      await loadWeeklyProgress();
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const todayActivities = activities.filter(a => a.date === selectedDate);
  const completedToday = todayActivities.filter(a => a.isCompleted).length;
  const completionRate = todayActivities.length > 0 ? (completedToday / todayActivities.length) * 100 : 0;
  const weeklyProgress = weeklyGoal > 0 ? (completedThisWeek / weeklyGoal) * 100 : 0;

  return (
    <div className="p-4 pb-24 space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold mb-2">Schedule & Calendar</h1>
        <p className="text-muted-foreground">Plan and track your daily activities</p>
      </div>

      {/* Weekly Progress */}
      <Card className="gradient-success text-white shadow-success">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm opacity-90">This Week</p>
                <p className="text-xl font-bold">{completedThisWeek}/{weeklyGoal} Goals</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30">
              {Math.round(weeklyProgress)}%
            </Badge>
          </div>
          <div className="mt-3">
            <Progress value={weeklyProgress} className="h-2 bg-white/20" />
          </div>
        </CardContent>
      </Card>

      {/* Date Selector */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-primary" />
            Select Date
          </CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-full p-3 border border-border rounded-lg bg-background"
          />
        </CardContent>
      </Card>

      {/* Today's Progress */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-secondary" />
            Today's Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Activities completed</span>
              <span className="font-medium">{completedToday} of {todayActivities.length}</span>
            </div>
            <Progress value={completionRate} className="h-3" />
            <p className="text-xs text-muted-foreground">
              {completionRate === 100 
                ? "Perfect day! All activities completed! 🎉"
                : `${todayActivities.length - completedToday} activities remaining`
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Add Activity */}
      <Card className="shadow-card">
        <CardContent className="p-4">
          <Button className="w-full gradient-primary shadow-primary text-white">
            <Plus className="h-4 w-4 mr-2" />
            Schedule New Activity
          </Button>
        </CardContent>
      </Card>

      {/* Activities List */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">
          Activities for {new Date(selectedDate).toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'short', 
            day: 'numeric' 
          })}
        </h3>
        
        {todayActivities.length === 0 ? (
          <Card className="shadow-card">
            <CardContent className="p-8 text-center">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-semibold mb-2">No activities scheduled</h3>
              <p className="text-sm text-muted-foreground mb-4">
                Schedule your first activity to start tracking your progress.
              </p>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Activity
              </Button>
            </CardContent>
          </Card>
        ) : (
          todayActivities.map((activity) => (
            <Card key={activity.id} className={`shadow-card transition-all duration-200 ${activity.isCompleted ? 'bg-success/5 border-success/20' : ''}`}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => toggleActivity(activity.id)}
                      className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                        activity.isCompleted 
                          ? 'bg-success border-success text-white' 
                          : 'border-muted-foreground hover:border-primary'
                      }`}
                    >
                      {activity.isCompleted && <CheckCircle className="h-4 w-4" />}
                    </button>
                    <div>
                      <h4 className={`font-semibold ${activity.isCompleted ? 'line-through text-muted-foreground' : ''}`}>
                        {activity.title}
                      </h4>
                      <div className="flex items-center gap-2 mt-1">
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {activity.time}
                        </div>
                        {activity.isRecurring && (
                          <Badge variant="outline" className="text-xs">
                            Recurring
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{activityTypes[activity.type].icon}</span>
                    <Badge className={activityTypes[activity.type].color}>
                      {activityTypes[activity.type].label}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Quick Stats */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle>Quick Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-center">
            <div className="p-3 bg-primary/5 rounded-lg">
              <p className="text-2xl font-bold text-primary">{activities.filter(a => a.isCompleted).length}</p>
              <p className="text-xs text-muted-foreground">Total Completed</p>
            </div>
            <div className="p-3 bg-secondary/5 rounded-lg">
              <p className="text-2xl font-bold text-secondary">{activities.filter(a => a.isRecurring).length}</p>
              <p className="text-xs text-muted-foreground">Recurring Activities</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};