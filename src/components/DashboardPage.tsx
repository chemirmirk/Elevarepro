import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Target, Calendar, TrendingUp, Award, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { GoalsDashboard } from "@/components/GoalsDashboard";
import { GoalNotifications } from "@/components/GoalNotifications";

export const DashboardPage = () => {
  const { user } = useAuth();
  const [currentStreak, setCurrentStreak] = useState(0);
  const [personalBestStreak, setPersonalBestStreak] = useState(0);
  const [weeklyGoal, setWeeklyGoal] = useState(5);
  const [completedThisWeek, setCompletedThisWeek] = useState(0);
  const [achievements, setAchievements] = useState<any[]>([]);
  const [todayActivities, setTodayActivities] = useState<any[]>([]);
  const progressPercentage = weeklyGoal > 0 ? (completedThisWeek / weeklyGoal) * 100 : 0;

  useEffect(() => {
    if (user) {
      loadUserData();
      loadTodayActivities();
    }
  }, [user]);

  const loadUserData = async () => {
    if (!user) return;
    
    try {
      // Load streak data
      const { data: streakData } = await supabase
        .from('streaks')
        .select('current_count, best_count, last_updated')
        .eq('user_id', user.id)
        .eq('streak_type', 'daily_checkin')
        .maybeSingle();

      if (streakData) {
        // Always set personal best
        setPersonalBestStreak(streakData.best_count || 0);
        
        // Check if streak should be reset due to missed days
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const lastUpdated = streakData.last_updated;
        
        if (lastUpdated && lastUpdated < yesterdayStr) {
          // Missed days - streak should show 0
          setCurrentStreak(0);
        } else {
          // Either updated yesterday/today or no last_updated - show current count
          setCurrentStreak(streakData.current_count || 0);
        }
      } else {
        setCurrentStreak(0);
        setPersonalBestStreak(0);
      }

      // Load weekly progress (check-ins this week)
      const startOfWeek = new Date();
      startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
      
      const { data: weeklyData } = await supabase
        .from('check_ins')
        .select('id')
        .eq('user_id', user.id)
        .gte('date', startOfWeek.toISOString().split('T')[0]);

      setCompletedThisWeek(weeklyData?.length || 0);

      // Load recent achievements
      const { data: achievementData } = await supabase
        .from('achievements')
        .select('*')
        .eq('user_id', user.id)
        .order('earned_at', { ascending: false })
        .limit(3);

      setAchievements(achievementData || []);

      // Load weekly goal from goals table
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
      console.error('Error loading dashboard data:', error);
    }
  };

  const loadTodayActivities = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today);

      if (error) throw error;
      
      setTodayActivities(data || []);
    } catch (error) {
      console.error('Error loading today activities:', error);
    }
  };

  return (
    <div className="p-6 pb-24 space-y-6 max-w-2xl mx-auto">
      {/* Modern welcome header */}
      <div className="text-center py-8 px-4">
        <h1 className="text-3xl font-bold text-gradient mb-3">Welcome back! 👋</h1>
        <p className="text-muted-foreground text-lg">Keep up the great work on your journey</p>
      </div>

      {/* Modern streak card */}
      <Card className="gradient-primary text-white shadow-large hover-lift animate-slide-up rounded-2xl overflow-hidden">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Current Streak</h3>
              <div className="flex items-center gap-2">
                <Flame className="h-6 w-6 text-orange-300" />
                <span className="text-3xl font-bold">{currentStreak}</span>
                <span className="text-sm opacity-90">days</span>
              </div>
              <p className="text-sm opacity-80 mt-2">
                {currentStreak > 0 
                  ? "Keep it up!" 
                  : "Let's go again — you've got this!"
                }
              </p>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30 mb-2">
                Personal Best: {personalBestStreak}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modern quick stats */}
      <div className="grid grid-cols-2 gap-6">
        <Card className="shadow-medium hover-lift rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-success/10 rounded-xl">
                <Target className="h-6 w-6 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">This Week</p>
                <p className="text-2xl font-bold">{completedThisWeek}/{weeklyGoal}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-medium hover-lift rounded-2xl">
          <CardContent className="p-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-secondary/10 rounded-xl">
                <TrendingUp className="h-6 w-6 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">Progress</p>
                <p className="text-2xl font-bold">{Math.round(progressPercentage)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modern notifications and goals */}
      <GoalNotifications className="shadow-medium hover-lift rounded-2xl" />
      <GoalsDashboard className="shadow-medium hover-lift rounded-2xl" />

      {/* Modern weekly progress */}
      <Card className="shadow-medium hover-lift rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 bg-primary/10 rounded-xl">
              <Calendar className="h-6 w-6 text-primary" />
            </div>
            Weekly Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span>Goals completed this week</span>
              <span className="font-medium">{completedThisWeek} of {weeklyGoal}</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
            <p className="text-xs text-muted-foreground">
              You're doing great! {weeklyGoal - completedThisWeek} more to reach your weekly goal.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Modern today's goals */}
      <Card className="shadow-medium hover-lift rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 bg-warning/10 rounded-xl">
              <Clock className="h-6 w-6 text-warning" />
            </div>
            Today's Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {todayActivities.length === 0 ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">No goals set for today</p>
              <p className="text-xs text-muted-foreground mt-1">Add some activities to get started!</p>
            </div>
          ) : (
            todayActivities.map((activity) => (
              <div key={activity.id} className={`flex items-center justify-between p-3 rounded-lg ${
                activity.isCompleted ? 'bg-success/10' : 'bg-muted/50'
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-4 h-4 rounded-full ${
                    activity.isCompleted 
                      ? 'bg-success flex items-center justify-center' 
                      : 'border-2 border-primary'
                  }`}>
                    {activity.isCompleted && <div className="w-2 h-2 bg-white rounded-full"></div>}
                  </div>
                  <span className="font-medium">{activity.title}</span>
                </div>
                <Badge className={activity.isCompleted ? 'bg-success text-success-foreground' : ''} variant={activity.isCompleted ? 'default' : 'outline'}>
                  {activity.isCompleted ? 'Complete' : 'Pending'}
                </Badge>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {/* Modern achievements */}
      <Card className="shadow-medium hover-lift rounded-2xl">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-3 text-xl font-bold">
            <div className="p-2 bg-warning/10 rounded-xl">
              <Award className="h-6 w-6 text-warning" />
            </div>
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {achievements.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No achievements yet</p>
                <p className="text-xs text-muted-foreground mt-1">Keep working towards your goals!</p>
              </div>
            ) : (
              achievements.map((achievement) => (
                <div key={achievement.id} className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg">
                  <div className="p-2 bg-warning/20 rounded-full">
                    <Award className="h-4 w-4 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium">{achievement.title}</p>
                    <p className="text-sm text-muted-foreground">{achievement.description}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Modern quick actions */}
      <div className="grid grid-cols-2 gap-6 pt-4">
        <Button className="h-14 gradient-primary shadow-large text-white rounded-2xl hover-lift font-semibold">
          Start Check-in
        </Button>
        <Button variant="gradient" className="h-14 rounded-2xl hover-lift font-semibold">
          View Calendar
        </Button>
      </div>
    </div>
  );
};