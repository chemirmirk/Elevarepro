import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, Target, Calendar, TrendingUp, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface GoalNotification {
  goalId: string;
  goalType: string;
  type: 'overdue' | 'urgent' | 'behind' | 'ahead';
  message: string;
  daysRemaining: number;
  progressPercentage: string;
}

interface GoalNotificationsProps {
  className?: string;
  onDismiss?: (goalId: string) => void;
}

export const GoalNotifications = ({ className, onDismiss }: GoalNotificationsProps) => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<GoalNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissedNotifications, setDismissedNotifications] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (user) {
      checkGoalDeadlines();
      
      // Check for notifications periodically
      const interval = setInterval(checkGoalDeadlines, 5 * 60 * 1000); // Every 5 minutes
      
      return () => clearInterval(interval);
    }
  }, [user]);

  const checkGoalDeadlines = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase.functions.invoke('goal-progress-tracker', {
        body: {
          action: 'checkDeadlines',
          userId: user.id
        }
      });

      if (error) throw error;

      // Filter out dismissed notifications
      const activeNotifications = (data.notifications || []).filter(
        (notification: GoalNotification) => !dismissedNotifications.has(notification.goalId)
      );
      
      setNotifications(activeNotifications);
    } catch (error) {
      console.error('Error checking goal deadlines:', error);
    } finally {
      setLoading(false);
    }
  };

  const dismissNotification = (goalId: string) => {
    setDismissedNotifications(prev => new Set(prev.add(goalId)));
    setNotifications(prev => prev.filter(n => n.goalId !== goalId));
    onDismiss?.(goalId);
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'overdue':
        return <Calendar className="h-4 w-4 text-destructive" />;
      case 'urgent':
        return <Bell className="h-4 w-4 text-warning" />;
      case 'behind':
        return <TrendingUp className="h-4 w-4 text-warning" />;
      case 'ahead':
        return <Target className="h-4 w-4 text-success" />;
      default:
        return <Bell className="h-4 w-4" />;
    }
  };

  const getNotificationBadgeVariant = (type: string) => {
    switch (type) {
      case 'overdue':
        return 'destructive' as const;
      case 'urgent':
        return 'secondary' as const;
      case 'behind':
        return 'outline' as const;
      case 'ahead':
        return 'default' as const;
      default:
        return 'outline' as const;
    }
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-3">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-3 bg-muted rounded"></div>
            <div className="h-3 bg-muted rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (notifications.length === 0) {
    return null; // Don't show the card if no notifications
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Bell className="h-4 w-4" />
          Goal Updates ({notifications.length})
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {notifications.slice(0, 3).map((notification) => (
            <div 
              key={notification.goalId}
              className="flex items-start gap-3 p-3 bg-muted/20 rounded-lg border"
            >
              <div className="mt-0.5">
                {getNotificationIcon(notification.type)}
              </div>
              
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <Badge 
                    variant={getNotificationBadgeVariant(notification.type)}
                    className="text-xs"
                  >
                    {notification.type}
                  </Badge>
                  <span className="text-xs text-muted-foreground capitalize">
                    {notification.goalType.replace('_', ' ')}
                  </span>
                </div>
                
                <p className="text-sm">{notification.message}</p>
                
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Progress: {notification.progressPercentage}%</span>
                  {notification.daysRemaining >= 0 && (
                    <>
                      <span>•</span>
                      <span>{notification.daysRemaining} days left</span>
                    </>
                  )}
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dismissNotification(notification.goalId)}
                className="h-6 w-6 p-0"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
          
          {notifications.length > 3 && (
            <div className="text-center text-xs text-muted-foreground">
              +{notifications.length - 3} more notifications
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};