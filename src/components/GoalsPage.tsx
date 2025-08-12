import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Target, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface Goal {
  id: string;
  goal_type: string;
  target_amount: number;
  current_amount: number;
  target_unit: string;
  is_active: boolean;
}

export const GoalsPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<Goal | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    goal_type: "",
    target_amount: "",
    target_unit: "",
  });

  useEffect(() => {
    if (user) {
      loadGoals();
    }
  }, [user]);

  const loadGoals = async () => {
    try {
      const { data, error } = await supabase
        .from('goals')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setGoals(data || []);
    } catch (error) {
      console.error('Error loading goals:', error);
      toast({
        title: "Error",
        description: "Failed to load goals",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (!formData.goal_type || !formData.target_amount || !formData.target_unit) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      if (editingGoal) {
        // Update existing goal
        const { error } = await supabase
          .from('goals')
          .update({
            goal_type: formData.goal_type,
            target_amount: parseInt(formData.target_amount),
            target_unit: formData.target_unit,
          })
          .eq('id', editingGoal.id);

        if (error) throw error;
        toast({
          title: "Success",
          description: "Goal updated successfully",
        });
      } else {
        // Create new goal
        const { error } = await supabase
          .from('goals')
          .insert({
            user_id: user.id,
            goal_type: formData.goal_type,
            target_amount: parseInt(formData.target_amount),
            current_amount: 0,
            target_unit: formData.target_unit,
            is_active: true
          });

        if (error) throw error;
        toast({
          title: "Success",
          description: "Goal created successfully",
        });
      }

      // Reset form and close dialog
      resetForm();
      setIsDialogOpen(false);
      loadGoals();
    } catch (error) {
      console.error('Error saving goal:', error);
      toast({
        title: "Error",
        description: "Failed to save goal",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (goal: Goal) => {
    setEditingGoal(goal);
    setFormData({
      goal_type: goal.goal_type,
      target_amount: goal.target_amount.toString(),
      target_unit: goal.target_unit,
    });
    setIsDialogOpen(true);
  };

  const handleDeactivate = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ is_active: false })
        .eq('id', goalId);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Goal paused successfully",
      });
      loadGoals();
    } catch (error) {
      console.error('Error deactivating goal:', error);
      toast({
        title: "Error",
        description: "Failed to pause goal",
        variant: "destructive",
      });
    }
  };

  const handleReactivate = async (goalId: string) => {
    try {
      const { error } = await supabase
        .from('goals')
        .update({ is_active: true })
        .eq('id', goalId);

      if (error) throw error;
      toast({
        title: "Success",
        description: "Goal resumed successfully",
      });
      loadGoals();
    } catch (error) {
      console.error('Error reactivating goal:', error);
      toast({
        title: "Error",
        description: "Failed to resume goal",
        variant: "destructive",
      });
    }
  };

  const resetForm = () => {
    setFormData({ goal_type: "", target_amount: "", target_unit: "" });
    setEditingGoal(null);
  };

  const activeGoals = goals.filter(goal => goal.is_active);
  const inactiveGoals = goals.filter(goal => !goal.is_active);

  if (loading) {
    return (
      <div className="p-4 space-y-4">
        <div className="h-32 bg-muted rounded-lg animate-pulse" />
        <div className="h-32 bg-muted rounded-lg animate-pulse" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-muted-foreground">Manage your personal goals and track progress</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => {
          setIsDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Goal
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingGoal ? 'Edit Goal' : 'Create New Goal'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Label htmlFor="goal_type">Goal Type</Label>
                <Select value={formData.goal_type} onValueChange={(value) => setFormData({...formData, goal_type: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select goal type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily_checkin">Daily Check-in</SelectItem>
                    <SelectItem value="weekly_exercise">Weekly Exercise</SelectItem>
                    <SelectItem value="water_intake">Water Intake</SelectItem>
                    <SelectItem value="meditation">Meditation</SelectItem>
                    <SelectItem value="reading">Reading</SelectItem>
                    <SelectItem value="sleep">Sleep</SelectItem>
                    <SelectItem value="steps">Steps</SelectItem>
                    <SelectItem value="smoking_cessation">Smoking Cessation</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {formData.goal_type === 'custom' && (
                <div>
                  <Label htmlFor="custom_type">Custom Goal Name</Label>
                  <Input
                    id="custom_type"
                    value={formData.goal_type === 'custom' ? formData.goal_type : ''}
                    onChange={(e) => setFormData({...formData, goal_type: e.target.value})}
                    placeholder="Enter custom goal name"
                  />
                </div>
              )}

              <div>
                <Label htmlFor="target_amount">Target Amount</Label>
                <Input
                  id="target_amount"
                  type="number"
                  value={formData.target_amount}
                  onChange={(e) => setFormData({...formData, target_amount: e.target.value})}
                  placeholder="Enter target amount"
                />
              </div>

              <div>
                <Label htmlFor="target_unit">Unit</Label>
                <Select value={formData.target_unit} onValueChange={(value) => setFormData({...formData, target_unit: value})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="checkins">Check-ins</SelectItem>
                    <SelectItem value="sessions">Sessions</SelectItem>
                    <SelectItem value="glasses">Glasses</SelectItem>
                    <SelectItem value="minutes">Minutes</SelectItem>
                    <SelectItem value="hours">Hours</SelectItem>
                    <SelectItem value="pages">Pages</SelectItem>
                    <SelectItem value="steps">Steps</SelectItem>
                    <SelectItem value="cigarettes_per_day">Cigarettes per Day</SelectItem>
                    <SelectItem value="times">Times</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="flex-1">
                  {editingGoal ? 'Update Goal' : 'Create Goal'}
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsDialogOpen(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Active Goals</h2>
          {activeGoals.map((goal) => (
            <Card key={goal.id} className="shadow-card">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="capitalize flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    {goal.goal_type.replace('_', ' ')}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(goal)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDeactivate(goal.id)}>
                      Pause
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Progress</span>
                    <span className="text-sm font-medium">
                      {goal.current_amount} / {goal.target_amount} {goal.target_unit}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((goal.current_amount / goal.target_amount) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-sm font-medium text-primary">
                      {Math.round((goal.current_amount / goal.target_amount) * 100)}% complete
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Previous/Inactive Goals */}
      {inactiveGoals.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-muted-foreground">Previous Goals</h2>
          {inactiveGoals.map((goal) => (
            <Card key={goal.id} className="opacity-60 border-dashed">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="capitalize flex items-center gap-2">
                    <Target className="h-5 w-5 text-muted-foreground" />
                    {goal.goal_type.replace('_', ' ')}
                  </CardTitle>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleReactivate(goal.id)}>
                      Resume
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleEdit(goal)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-muted-foreground">Final Progress</span>
                    <span className="text-sm font-medium">
                      {goal.current_amount} / {goal.target_amount} {goal.target_unit}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-muted-foreground h-2 rounded-full transition-all"
                      style={{ width: `${Math.min((goal.current_amount / goal.target_amount) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-center">
                    <span className="text-sm text-muted-foreground">
                      {Math.round((goal.current_amount / goal.target_amount) * 100)}% completed
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Empty State */}
      {goals.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No goals yet</h3>
            <p className="text-muted-foreground mb-4">Create your first goal to start tracking your progress</p>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Goal
                </Button>
              </DialogTrigger>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
};