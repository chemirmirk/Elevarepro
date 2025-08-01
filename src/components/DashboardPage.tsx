import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Flame, Target, Calendar, TrendingUp, Award, Clock } from "lucide-react";

export const DashboardPage = () => {
  // Mock data - will be replaced with real data later
  const currentStreak = 7;
  const weeklyGoal = 5;
  const completedThisWeek = 4;
  const progressPercentage = (completedThisWeek / weeklyGoal) * 100;

  return (
    <div className="p-4 pb-24 space-y-4 max-w-md mx-auto">
      {/* Welcome Header */}
      <div className="text-center py-6">
        <h1 className="text-2xl font-bold mb-2">Welcome back! 👋</h1>
        <p className="text-muted-foreground">Keep up the great work on your journey</p>
      </div>

      {/* Streak Card */}
      <Card className="gradient-primary text-white shadow-primary animate-slide-up">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold mb-1">Current Streak</h3>
              <div className="flex items-center gap-2">
                <Flame className="h-6 w-6 text-orange-300" />
                <span className="text-3xl font-bold">{currentStreak}</span>
                <span className="text-sm opacity-90">days</span>
              </div>
            </div>
            <div className="text-right">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                Personal Best!
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-success/10 rounded-lg">
                <Target className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">This Week</p>
                <p className="text-lg font-semibold">{completedThisWeek}/{weeklyGoal}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-card">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-secondary/10 rounded-lg">
                <TrendingUp className="h-5 w-5 text-secondary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Progress</p>
                <p className="text-lg font-semibold">{Math.round(progressPercentage)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Progress */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-primary" />
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

      {/* Today's Goals */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-warning" />
            Today's Goals
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full border-2 border-primary"></div>
              <span className="font-medium">Go to gym</span>
            </div>
            <Badge variant="outline">Pending</Badge>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-success/10 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-success flex items-center justify-center">
                <div className="w-2 h-2 bg-white rounded-full"></div>
              </div>
              <span className="font-medium">Morning meditation</span>
            </div>
            <Badge className="bg-success text-success-foreground">Complete</Badge>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="shadow-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Award className="h-5 w-5 text-warning" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-warning/10 rounded-lg">
              <div className="p-2 bg-warning/20 rounded-full">
                <Flame className="h-4 w-4 text-warning" />
              </div>
              <div>
                <p className="font-medium">7-Day Streak!</p>
                <p className="text-sm text-muted-foreground">Completed check-ins for a week straight</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 gap-4">
        <Button className="h-12 gradient-primary shadow-primary text-white">
          Start Check-in
        </Button>
        <Button variant="outline" className="h-12">
          View Calendar
        </Button>
      </div>
    </div>
  );
};