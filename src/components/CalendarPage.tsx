import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Calendar, Plus, CheckCircle, Clock, Target, TrendingUp } from "lucide-react";

interface ScheduledActivity {
  id: string;
  title: string;
  date: string;
  time: string;
  type: 'gym' | 'meditation' | 'milestone' | 'other';
  isCompleted: boolean;
  isRecurring: boolean;
}

const mockActivities: ScheduledActivity[] = [
  {
    id: '1',
    title: 'Morning Gym Session',
    date: '2024-01-15',
    time: '07:00',
    type: 'gym',
    isCompleted: true,
    isRecurring: true
  },
  {
    id: '2',
    title: 'Meditation Practice',
    date: '2024-01-15',
    time: '08:30',
    type: 'meditation',
    isCompleted: true,
    isRecurring: true
  },
  {
    id: '3',
    title: 'Evening Workout',
    date: '2024-01-16',
    time: '18:00',
    type: 'gym',
    isCompleted: false,
    isRecurring: true
  },
  {
    id: '4',
    title: '30-Day Milestone',
    date: '2024-01-20',
    time: '00:00',
    type: 'milestone',
    isCompleted: false,
    isRecurring: false
  }
];

const activityTypes = {
  gym: { label: 'Gym', color: 'bg-primary/10 text-primary', icon: '🏋️' },
  meditation: { label: 'Meditation', color: 'bg-secondary/10 text-secondary', icon: '🧘' },
  milestone: { label: 'Milestone', color: 'bg-warning/10 text-warning', icon: '🎯' },
  other: { label: 'Other', color: 'bg-muted/10 text-muted-foreground', icon: '📅' }
};

export const CalendarPage = () => {
  const [activities, setActivities] = useState<ScheduledActivity[]>(mockActivities);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  
  const toggleActivity = (id: string) => {
    setActivities(prev => prev.map(activity => 
      activity.id === id ? { ...activity, isCompleted: !activity.isCompleted } : activity
    ));
  };

  const todayActivities = activities.filter(a => a.date === selectedDate);
  const completedToday = todayActivities.filter(a => a.isCompleted).length;
  const completionRate = todayActivities.length > 0 ? (completedToday / todayActivities.length) * 100 : 0;

  // Mock weekly stats
  const weeklyGoal = 5;
  const completedThisWeek = 4;
  const weeklyProgress = (completedThisWeek / weeklyGoal) * 100;

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