import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, CheckCircle, MessageSquare, Target, TrendingUp, Calendar, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const moodEmojis = [
  { value: 1, emoji: "😢", label: "Very Bad", color: "text-red-500" },
  { value: 2, emoji: "😕", label: "Bad", color: "text-orange-500" },
  { value: 3, emoji: "😐", label: "Okay", color: "text-yellow-500" },
  { value: 4, emoji: "😊", label: "Good", color: "text-blue-500" },
  { value: 5, emoji: "😄", label: "Great", color: "text-green-500" },
];

export const CheckinPage = () => {
  const { user } = useAuth();
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [progressNotes, setProgressNotes] = useState("");
  const [goalsAchieved, setGoalsAchieved] = useState("");
  const [challengesFaced, setChallengesFaced] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [moodData, setMoodData] = useState<number[]>([]);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);
  const [todayCheckIn, setTodayCheckIn] = useState<any>(null);
  const [activeGoals, setActiveGoals] = useState<any[]>([]);
  const [goalProgress, setGoalProgress] = useState<{ [key: string]: number }>({});
  const [goalProgressDialogOpen, setGoalProgressDialogOpen] = useState(false);

  useEffect(() => {
    if (user) {
      loadStreakData();
      loadRecentMoodData();
      checkTodayCheckIn();
      loadActiveGoals();
    }
  }, [user]);

  const loadActiveGoals = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      setActiveGoals(data || []);
      
      // Initialize goal progress tracking for today
      const today = new Date().toISOString().split('T')[0];
      const { data: progressData, error: progressError } = await supabase
        .from('goal_progress')
        .select('goal_id, progress_amount')
        .eq('user_id', user.id)
        .eq('recorded_date', today);
      
      if (!progressError && progressData) {
        const todayProgress: { [key: string]: number } = {};
        progressData.forEach((progress: any) => {
          todayProgress[progress.goal_id] = progress.progress_amount;
        });
        setGoalProgress(todayProgress);
      }
    } catch (error) {
      console.error('Error loading active goals:', error);
    }
  };

  const updateGoalProgress = async (goalId: string, amount: number) => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase.functions.invoke('goal-progress-tracker', {
        body: {
          action: 'updateProgress',
          userId: user.id,
          goalId,
          progressAmount: amount,
          notes: `Updated via daily check-in on ${new Date().toDateString()}`
        }
      });

      if (error) throw error;
      
      if (data.success) {
        toast.success(data.message);
        setGoalProgress(prev => ({ ...prev, [goalId]: amount }));
        
        // Refresh goals to show updated totals
        loadActiveGoals();
      }
    } catch (error) {
      console.error('Error updating goal progress:', error);
      toast.error("Failed to update goal progress. Please try again.");
    }
  };

  const loadStreakData = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('streaks')
        .select('current_count, best_count, last_updated')
        .eq('user_id', user.id)
        .eq('streak_type', 'daily_checkin')
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        // Check if streak should be reset due to missed days
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const yesterdayStr = yesterday.toISOString().split('T')[0];
        
        const lastUpdated = data.last_updated;
        
        if (lastUpdated && lastUpdated < yesterdayStr) {
          // Missed days - streak should show 0
          setCurrentStreak(0);
        } else {
          // Either updated yesterday/today or no last_updated - show current count
          setCurrentStreak(data.current_count || 0);
        }
      } else {
        setCurrentStreak(0);
      }
    } catch (error) {
      console.error('Error loading streak data:', error);
      setCurrentStreak(0);
    }
  };

  const loadRecentMoodData = async () => {
    if (!user) return;
    
    try {
      // Get the last 7 days of mood data
      const { data, error } = await supabase
        .from('check_ins')
        .select('mood, date')
        .eq('user_id', user.id)
        .not('mood', 'is', null)
        .order('date', { ascending: true });

      if (error) throw error;
      
      // Create array for last 7 days
      const last7Days = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];
        
        // Find mood for this specific date
        const moodEntry = data?.find(entry => entry.date === dateStr);
        last7Days.push(moodEntry ? moodEntry.mood : 0);
      }
      
      setMoodData(last7Days);
    } catch (error) {
      console.error('Error loading mood data:', error);
    }
  };

  const checkTodayCheckIn = async () => {
    if (!user) return;
    
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('check_ins')
        .select('*')
        .eq('user_id', user.id)
        .eq('date', today)
        .maybeSingle();

      if (error) throw error;
      
      if (data) {
        setHasCheckedInToday(true);
        setTodayCheckIn(data);
        // Only populate form if this is truly today's check-in
        const checkInDate = new Date(data.date).toISOString().split('T')[0];
        if (checkInDate === today) {
          setSelectedMood(data.mood);
          setProgressNotes(data.progress_notes || "");
          setGoalsAchieved(data.goals_achieved || "");
          setChallengesFaced(data.challenges || "");
        }
      } else {
        setHasCheckedInToday(false);
        setTodayCheckIn(null);
        // Clear form for new day
        setSelectedMood(null);
        setProgressNotes("");
        setGoalsAchieved("");
        setChallengesFaced("");
      }
    } catch (error) {
      console.error('Error checking today\'s check-in:', error);
    }
  };

  const handleSubmit = async () => {
    if (!selectedMood || !progressNotes.trim() || !goalsAchieved.trim() || !challengesFaced.trim() || !user) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      const today = new Date().toISOString().split('T')[0];
      
      if (hasCheckedInToday && todayCheckIn) {
        // Validate that we're only updating today's check-in
        const checkInDate = new Date(todayCheckIn.date).toISOString().split('T')[0];
        if (checkInDate !== today) {
          toast.error("You can only edit today's check-in. Previous check-ins are locked.");
          return;
        }
        
        // Update existing check-in (only for today)
        const { error: checkinError } = await supabase
          .from('check_ins')
          .update({
            mood: selectedMood,
            progress_notes: progressNotes.trim(),
            goals_achieved: goalsAchieved.trim(),
            challenges: challengesFaced.trim(),
          })
          .eq('id', todayCheckIn.id)
          .eq('date', today); // Extra safety - ensure we're only updating today's record

        if (checkinError) throw checkinError;
        toast.success("Check-in updated successfully!");
        
        // Also update streak for updated check-ins if this is the first update today
        if (new Date(todayCheckIn.created_at).toDateString() === new Date().toDateString()) {
          await updateDailyCheckinStreak();
        }
      } else {
        // Create new check-in (only allowed for today)
        const { error: checkinError } = await supabase
          .from('check_ins')
          .insert({
            user_id: user.id,
            mood: selectedMood,
            progress_notes: progressNotes.trim(),
            goals_achieved: goalsAchieved.trim(),
            challenges: challengesFaced.trim(),
            date: today
          });

        if (checkinError) throw checkinError;
        toast.success("Check-in completed successfully!");
        
        // Update streak only for new check-ins
        await updateDailyCheckinStreak();
      }

      // Always refresh all data after any check-in operation
      await loadRecentMoodData(); // Refresh mood data immediately
      await loadStreakData();     // Refresh streak data immediately
      await checkTodayCheckIn();  // Refresh today's check-in status
      
      // Reset form state
      setProgressNotes("");
      setGoalsAchieved("");
      setChallengesFaced("");
      setSelectedMood(null);
      setHasCheckedInToday(true);
      
    } catch (error) {
      console.error('Error saving check-in:', error);
      toast.error("Failed to save check-in. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateDailyCheckinStreak = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('update-streak', {
        body: {
          userId: user.id,
          streakType: 'daily_checkin'
        }
      });

      if (error) {
        console.error('Error calling update-streak function:', error);
        throw error;
      }

      const { currentStreak, isPersonalBest, bestStreak, wasStreakReset } = data;
      setCurrentStreak(currentStreak);

      if (isPersonalBest) {
        toast.success(`🎉 New personal best! ${currentStreak} day streak!`);
      } else if (wasStreakReset) {
        toast.info(`Streak reset due to missed days. Starting fresh with 1 day! Your best is ${bestStreak} days.`);
      } else if (currentStreak > 1) {
        toast.success(`Great job! ${currentStreak} day streak and counting!`);
      }

    } catch (error) {
      console.error('Error updating streak:', error);
      toast.error("Failed to update streak data.");
    }
  };

  const isFormValid = selectedMood && progressNotes.trim() && goalsAchieved.trim() && challengesFaced.trim();

  return (
    <div className="p-4 pb-24 space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold mb-2">Daily Check-in</h1>
        <p className="text-muted-foreground">
          {hasCheckedInToday 
            ? "You've already checked in today! You can update your responses below." 
            : "How was your day? Let's track your progress"
          }
        </p>
      </div>

      {/* Streak Counter */}
      <Card className={`${hasCheckedInToday ? 'bg-green-50 border-green-200' : 'gradient-primary shadow-primary'} ${hasCheckedInToday ? 'text-green-800' : 'text-white'}`}>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 ${hasCheckedInToday ? 'bg-green-200' : 'bg-white/20'} rounded-full`}>
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className={`text-sm ${hasCheckedInToday ? 'text-green-600' : 'opacity-90'}`}>Check-in Streak</p>
                <p className="text-xl font-bold">{currentStreak} days</p>
              </div>
            </div>
            <Badge className={hasCheckedInToday ? 'bg-green-200 text-green-800 border-green-300' : 'bg-white/20 text-white border-white/30'}>
              {hasCheckedInToday ? 'Completed!' : 'Keep it up!'}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Mood Tracker */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-red-500" />
            How are you feeling today?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-5 gap-2">
            {moodEmojis.map((mood) => (
              <button
                key={mood.value}
                onClick={() => setSelectedMood(mood.value)}
                className={`p-3 rounded-lg text-center transition-all duration-200 ${
                  selectedMood === mood.value
                    ? 'bg-primary/10 border-2 border-primary scale-105'
                    : 'bg-muted/50 border-2 border-transparent hover:bg-muted'
                }`}
              >
                <div className="text-2xl mb-1">{mood.emoji}</div>
                <div className="text-xs font-medium">{mood.label}</div>
              </button>
            ))}
          </div>
          
          {/* Mood Trend */}
          <div className="mt-4 p-3 bg-muted/30 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium">7-Day Mood Trend</span>
            </div>
            <div className="flex items-end justify-between gap-1 h-16 mb-2">
              {moodData.map((moodValue, index) => {
                const height = moodValue > 0 ? (moodValue / 5) * 100 : 10;
                const moodEmoji = moodEmojis.find(m => m.value === moodValue);
                
                // Calculate the actual date for this position (last 7 days)
                const date = new Date();
                date.setDate(date.getDate() - (6 - index));
                const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
                const dayName = dayNames[date.getDay()];
                
                return (
                  <div key={index} className="flex-1 flex flex-col items-center">
                    <div 
                      className={`w-full rounded-sm transition-all duration-300 ${
                        moodValue > 0 ? 'bg-secondary' : 'bg-muted border border-dashed border-muted-foreground/30'
                      }`}
                      style={{ height: `${height}%` }}
                      title={moodEmoji ? `${dayName}: ${moodEmoji.label} (${moodValue}/5)` : `${dayName}: No data`}
                    />
                    <span className="text-xs text-muted-foreground mt-1">{dayName}</span>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>😢</span>
              <span className="text-center">Mood Scale</span>
              <span>😄</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Goal Progress Tracking */}
      {activeGoals.length > 0 && (
        <Card className="shadow-card">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-primary" />
                Today's Goal Progress
              </CardTitle>
              <Dialog open={goalProgressDialogOpen} onOpenChange={setGoalProgressDialogOpen}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Update Goals
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Update Goal Progress</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 max-h-96 overflow-y-auto">
                    {activeGoals.map((goal) => (
                      <div key={goal.id} className="space-y-3 p-4 border rounded-lg">
                        <div>
                          <h4 className="font-medium capitalize">{goal.goal_type.replace('_', ' ')}</h4>
                          {goal.goal_description && (
                            <p className="text-sm text-muted-foreground">{goal.goal_description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Total Progress: {goal.current_amount}/{goal.target_amount} {goal.target_unit}
                          </p>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor={`progress-${goal.id}`}>Today's Progress</Label>
                          <div className="flex gap-2">
                            <Input
                              id={`progress-${goal.id}`}
                              type="number"
                              min="0"
                              value={goalProgress[goal.id] || 0}
                              onChange={(e) => setGoalProgress(prev => ({ 
                                ...prev, 
                                [goal.id]: parseInt(e.target.value) || 0 
                              }))}
                              className="flex-1"
                            />
                            <Button
                              size="sm"
                              onClick={() => updateGoalProgress(goal.id, goalProgress[goal.id] || 0)}
                            >
                              Save
                            </Button>
                          </div>
                        </div>

                        {goal.end_date && (
                          <div className="text-xs text-muted-foreground">
                            {(() => {
                              const today = new Date();
                              const deadline = new Date(goal.end_date);
                              const daysRemaining = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                              
                              if (daysRemaining < 0) {
                                return <span className="text-destructive">Overdue by {Math.abs(daysRemaining)} days</span>;
                              } else if (daysRemaining === 0) {
                                return <span className="text-destructive">Due today!</span>;
                              } else if (daysRemaining <= 3) {
                                return <span className="text-warning">{daysRemaining} days remaining</span>;
                              } else {
                                return <span>{daysRemaining} days remaining</span>;
                              }
                            })()}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activeGoals.slice(0, 2).map((goal) => (
                <div key={goal.id} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                  <div className="flex-1">
                    <p className="font-medium text-sm capitalize">{goal.goal_type.replace('_', ' ')}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress 
                        value={Math.min((goal.current_amount / goal.target_amount) * 100, 100)} 
                        className="flex-1 h-2"
                      />
                      <span className="text-xs text-muted-foreground">
                        {goal.current_amount}/{goal.target_amount}
                      </span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-xs">
                    Today: +{goalProgress[goal.id] || 0}
                  </Badge>
                </div>
              ))}
              
              {activeGoals.length > 2 && (
                <div className="text-center">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setGoalProgressDialogOpen(true)}
                    className="text-xs"
                  >
                    View all {activeGoals.length} goals
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Notes */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-secondary" />
            Progress Notes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="What did you accomplish today toward your goal? Be specific about your progress..."
            value={progressNotes}
            onChange={(e) => setProgressNotes(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {progressNotes.length}/500 characters
          </p>
        </CardContent>
      </Card>

      {/* Goals Achieved */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5 text-success" />
            Goals Achieved
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Which specific goals did you complete today? List your wins, big or small..."
            value={goalsAchieved}
            onChange={(e) => setGoalsAchieved(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {goalsAchieved.length}/500 characters
          </p>
        </CardContent>
      </Card>

      {/* Challenges Faced */}
      <Card className="shadow-card">
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-warning" />
            Challenges & Solutions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="What obstacles did you encounter today? How did you handle them or plan to overcome them..."
            value={challengesFaced}
            onChange={(e) => setChallengesFaced(e.target.value)}
            className="min-h-[80px] resize-none"
          />
          <p className="text-xs text-muted-foreground mt-2">
            {challengesFaced.length}/500 characters
          </p>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="space-y-3">
        <div className="bg-muted/30 rounded-lg p-3">
          <div className="flex justify-between text-sm mb-2">
            <span>Check-in Progress</span>
            <span>{isFormValid ? '100%' : Math.round((Object.values({selectedMood, progressNotes: progressNotes.trim(), goalsAchieved: goalsAchieved.trim(), challengesFaced: challengesFaced.trim()}).filter(Boolean).length / 4) * 100)}%</span>
          </div>
          <Progress value={isFormValid ? 100 : (Object.values({selectedMood, progressNotes: progressNotes.trim(), goalsAchieved: goalsAchieved.trim(), challengesFaced: challengesFaced.trim()}).filter(Boolean).length / 4) * 100} className="h-2" />
        </div>
        
        <Button
          onClick={handleSubmit}
          disabled={!isFormValid || isSubmitting}
          className="w-full h-12 gradient-primary shadow-primary text-white font-semibold"
        >
          {isSubmitting ? "Saving..." : hasCheckedInToday ? "Update Check-in" : "Complete Check-in"}
        </Button>
      </div>
    </div>
  );
};