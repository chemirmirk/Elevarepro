import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Target, Calendar, TrendingUp, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

interface DashboardGoal {
  id: string;
  goalType: string;
  description: string;
  progress: number;
  target: number;
  progressPercentage: number;
  daysRemaining: number | null;
  isOverdue: boolean;
  unit: string;
}

interface GoalsDashboardProps {
  className?: string;
}

export const GoalsDashboard = ({ className }: GoalsDashboardProps) => {
  const { user } = useAuth();
  const [goals, setGoals] = useState<DashboardGoal[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalActiveGoals: 0,
    completedGoals: 0,
    overdueGoals: 0
  });

  useEffect(() => {
    if (user) {
      loadGoalsDashboardData();
    }
  }, [user]);

  const loadGoalsDashboardData = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('goal-progress-tracker', {
        body: {
          action: 'getDashboardData',
          userId: user.id
        }
      });

      if (error) throw error;

      setGoals(data.goals || []);
      setStats({
        totalActiveGoals: data.totalActiveGoals || 0,
        completedGoals: data.completedGoals || 0,
        overdueGoals: data.overdueGoals || 0
      });
    } catch (error) {
      console.error('Error loading goals dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-muted rounded"></div>
              <div className="h-2 bg-muted rounded"></div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (goals.length === 0) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Target className="h-4 w-4" />
            Goals Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-muted-foreground">
            No active goals found. Create your first goal to start tracking progress!
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Target className="h-4 w-4" />
          Goals Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0 space-y-4">
        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-muted/30 rounded-lg">
            <div className="text-lg font-bold text-primary">{stats.totalActiveGoals}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </div>
          <div className="text-center p-2 bg-success/10 rounded-lg">
            <div className="text-lg font-bold text-success">{stats.completedGoals}</div>
            <div className="text-xs text-muted-foreground">Completed</div>
          </div>
          <div className="text-center p-2 bg-destructive/10 rounded-lg">
            <div className="text-lg font-bold text-destructive">{stats.overdueGoals}</div>
            <div className="text-xs text-muted-foreground">Overdue</div>
          </div>
        </div>

        {/* Goals List */}
        <div className="space-y-3">
          {goals.slice(0, 3).map((goal) => (
            <div key={goal.id} className="space-y-2 p-3 border rounded-lg">
              <div className="flex items-center justify-between">
                <h4 className="font-medium text-sm capitalize">
                  {goal.goalType.replace('_', ' ')}
                </h4>
                {goal.daysRemaining !== null && (
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {goal.isOverdue 
                        ? <Badge variant="destructive" className="text-xs">Overdue</Badge>
                        : `${goal.daysRemaining}d left`
                      }
                    </span>
                  </div>
                )}
              </div>
              
              <Progress 
                value={goal.progressPercentage} 
                className="h-2"
              />
              
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{goal.progress}/{goal.target} {goal.unit}</span>
                <span>{goal.progressPercentage.toFixed(1)}% complete</span>
              </div>
            </div>
          ))}
          
          {goals.length > 3 && (
            <div className="text-center text-xs text-muted-foreground">
              +{goals.length - 3} more goals
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};