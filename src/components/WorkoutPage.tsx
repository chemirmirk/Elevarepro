import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dumbbell, Plus, History, Edit, Trash2, Clock, Weight, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Exercise {
  id: string;
  name: string;
  muscle_group: string;
  description?: string;
  is_custom: boolean;
}

interface WorkoutSession {
  id: string;
  date: string;
  name?: string;
  duration_minutes?: number;
  notes?: string;
}

interface WorkoutSet {
  id: string;
  session_id: string;
  exercise_id: string;
  exercise_name?: string;
  set_number: number;
  reps: number;
  weight?: number;
  rest_seconds?: number;
  notes?: string;
}

interface CurrentWorkout {
  exercise_id: string;
  exercise_name: string;
  sets: Array<{
    reps: number;
    weight?: number;
    rest_seconds?: number;
  }>;
}

export const WorkoutPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [currentWorkout, setCurrentWorkout] = useState<CurrentWorkout[]>([]);
  const [selectedExercise, setSelectedExercise] = useState<string>("");
  const [isActiveWorkout, setIsActiveWorkout] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [workoutName, setWorkoutName] = useState("");
  const [loading, setLoading] = useState(true);
  const [showNewExerciseDialog, setShowNewExerciseDialog] = useState(false);
  
  // New exercise form
  const [newExercise, setNewExercise] = useState({
    name: "",
    muscle_group: "",
    description: ""
  });

  // Current set form
  const [currentSet, setCurrentSet] = useState({
    reps: "",
    weight: "",
    rest_seconds: ""
  });

  useEffect(() => {
    if (user) {
      loadExercises();
      loadWorkoutHistory();
    }
  }, [user]);

  const loadExercises = async () => {
    try {
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .or(`user_id.eq.${user?.id},is_custom.eq.false`)
        .order('name');

      if (error) throw error;
      setExercises(data || []);
    } catch (error) {
      console.error('Error loading exercises:', error);
      toast({
        title: "Error",
        description: "Failed to load exercises",
        variant: "destructive"
      });
    }
  };

  const loadWorkoutHistory = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .select(`
          *,
          workout_sets (
            *,
            exercises (name)
          )
        `)
        .eq('user_id', user?.id)
        .order('date', { ascending: false })
        .limit(10);

      if (error) throw error;
      setWorkoutSessions(data || []);
    } catch (error) {
      console.error('Error loading workout history:', error);
    } finally {
      setLoading(false);
    }
  };

  const startWorkout = async () => {
    try {
      const { data, error } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user?.id,
          name: workoutName || `Workout ${format(new Date(), 'MMM dd, yyyy')}`,
          date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

      if (error) throw error;

      setActiveSessionId(data.id);
      setIsActiveWorkout(true);
      toast({
        title: "Workout Started",
        description: "Your workout session has begun!"
      });
    } catch (error) {
      console.error('Error starting workout:', error);
      toast({
        title: "Error",
        description: "Failed to start workout",
        variant: "destructive"
      });
    }
  };

  const addExerciseToWorkout = () => {
    if (!selectedExercise) return;
    
    const exercise = exercises.find(e => e.id === selectedExercise);
    if (!exercise) return;

    const existingExercise = currentWorkout.find(w => w.exercise_id === selectedExercise);
    if (existingExercise) {
      toast({
        title: "Exercise Already Added",
        description: "This exercise is already in your current workout"
      });
      return;
    }

    setCurrentWorkout(prev => [...prev, {
      exercise_id: selectedExercise,
      exercise_name: exercise.name,
      sets: []
    }]);
    setSelectedExercise("");
  };

  const addSetToExercise = async (exerciseId: string) => {
    if (!currentSet.reps) return;

    const reps = parseInt(currentSet.reps);
    const weight = currentSet.weight ? parseFloat(currentSet.weight) : undefined;
    const rest_seconds = currentSet.rest_seconds ? parseInt(currentSet.rest_seconds) : undefined;

    // Add to current workout state
    setCurrentWorkout(prev => prev.map(workout => {
      if (workout.exercise_id === exerciseId) {
        return {
          ...workout,
          sets: [...workout.sets, { reps, weight, rest_seconds }]
        };
      }
      return workout;
    }));

    // Save to database
    try {
      const setNumber = currentWorkout.find(w => w.exercise_id === exerciseId)?.sets.length + 1 || 1;
      
      const { error } = await supabase
        .from('workout_sets')
        .insert({
          user_id: user?.id,
          session_id: activeSessionId,
          exercise_id: exerciseId,
          set_number: setNumber,
          reps,
          weight,
          rest_seconds
        });

      if (error) throw error;

      setCurrentSet({ reps: "", weight: "", rest_seconds: "" });
      toast({
        title: "Set Added",
        description: `Added set ${setNumber} to ${currentWorkout.find(w => w.exercise_id === exerciseId)?.exercise_name}`
      });
    } catch (error) {
      console.error('Error saving set:', error);
      toast({
        title: "Error",
        description: "Failed to save set",
        variant: "destructive"
      });
    }
  };

  const finishWorkout = async () => {
    try {
      // Update session with duration (simplified calculation)
      const { error } = await supabase
        .from('workout_sessions')
        .update({
          duration_minutes: 60 // This could be calculated based on actual time
        })
        .eq('id', activeSessionId);

      if (error) throw error;

      setIsActiveWorkout(false);
      setActiveSessionId(null);
      setCurrentWorkout([]);
      setWorkoutName("");
      loadWorkoutHistory();
      
      toast({
        title: "Workout Complete",
        description: "Great job! Your workout has been saved."
      });
    } catch (error) {
      console.error('Error finishing workout:', error);
      toast({
        title: "Error",
        description: "Failed to save workout",
        variant: "destructive"
      });
    }
  };

  const createNewExercise = async () => {
    if (!newExercise.name || !newExercise.muscle_group) return;

    try {
      const { data, error } = await supabase
        .from('exercises')
        .insert({
          user_id: user?.id,
          name: newExercise.name,
          muscle_group: newExercise.muscle_group,
          description: newExercise.description,
          is_custom: true
        })
        .select()
        .single();

      if (error) throw error;

      setExercises(prev => [...prev, data]);
      setNewExercise({ name: "", muscle_group: "", description: "" });
      setShowNewExerciseDialog(false);
      
      toast({
        title: "Exercise Created",
        description: `${data.name} has been added to your exercise library`
      });
    } catch (error) {
      console.error('Error creating exercise:', error);
      toast({
        title: "Error",
        description: "Failed to create exercise",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 pb-20 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Dumbbell className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Workout Tracker</h1>
        </div>
        
        {!isActiveWorkout && (
          <div className="flex gap-2">
            <Input
              placeholder="Workout name (optional)"
              value={workoutName}
              onChange={(e) => setWorkoutName(e.target.value)}
              className="w-48"
            />
            <Button onClick={startWorkout} variant="gradient">
              <Plus className="h-4 w-4 mr-2" />
              Start Workout
            </Button>
          </div>
        )}
      </div>

      <Tabs defaultValue="current" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="current">Current Workout</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="current" className="space-y-4">
          {isActiveWorkout ? (
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Active Workout</span>
                    <Button onClick={finishWorkout} variant="gradient">
                      Finish Workout
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-2">
                    <Select value={selectedExercise} onValueChange={setSelectedExercise}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select an exercise" />
                      </SelectTrigger>
                      <SelectContent>
                        {exercises.map((exercise) => (
                          <SelectItem key={exercise.id} value={exercise.id}>
                            {exercise.name} ({exercise.muscle_group})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button onClick={addExerciseToWorkout} disabled={!selectedExercise}>
                      Add Exercise
                    </Button>
                    <Dialog open={showNewExerciseDialog} onOpenChange={setShowNewExerciseDialog}>
                      <DialogTrigger asChild>
                        <Button variant="outline">
                          <Plus className="h-4 w-4" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Create New Exercise</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div>
                            <Label htmlFor="name">Exercise Name</Label>
                            <Input
                              id="name"
                              value={newExercise.name}
                              onChange={(e) => setNewExercise(prev => ({ ...prev, name: e.target.value }))}
                            />
                          </div>
                          <div>
                            <Label htmlFor="muscle_group">Muscle Group</Label>
                            <Select value={newExercise.muscle_group} onValueChange={(value) => setNewExercise(prev => ({ ...prev, muscle_group: value }))}>
                              <SelectTrigger>
                                <SelectValue placeholder="Select muscle group" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="Chest">Chest</SelectItem>
                                <SelectItem value="Back">Back</SelectItem>
                                <SelectItem value="Shoulders">Shoulders</SelectItem>
                                <SelectItem value="Arms">Arms</SelectItem>
                                <SelectItem value="Legs">Legs</SelectItem>
                                <SelectItem value="Core">Core</SelectItem>
                                <SelectItem value="Cardio">Cardio</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label htmlFor="description">Description (optional)</Label>
                            <Textarea
                              id="description"
                              value={newExercise.description}
                              onChange={(e) => setNewExercise(prev => ({ ...prev, description: e.target.value }))}
                            />
                          </div>
                          <Button onClick={createNewExercise} variant="gradient" className="w-full">
                            Create Exercise
                          </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>

                  {currentWorkout.map((workout) => (
                    <Card key={workout.exercise_id}>
                      <CardHeader>
                        <CardTitle className="text-lg">{workout.exercise_name}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {workout.sets.map((set, index) => (
                          <div key={index} className="flex items-center gap-4 p-2 bg-muted rounded">
                            <Badge variant="outline">Set {index + 1}</Badge>
                            <span>{set.reps} reps</span>
                            {set.weight && <span>{set.weight} lbs</span>}
                            {set.rest_seconds && <span>{set.rest_seconds}s rest</span>}
                          </div>
                        ))}
                        
                        <div className="flex gap-2">
                          <Input
                            placeholder="Reps"
                            type="number"
                            value={currentSet.reps}
                            onChange={(e) => setCurrentSet(prev => ({ ...prev, reps: e.target.value }))}
                            className="w-20"
                          />
                          <Input
                            placeholder="Weight (lbs)"
                            type="number"
                            step="0.25"
                            value={currentSet.weight}
                            onChange={(e) => setCurrentSet(prev => ({ ...prev, weight: e.target.value }))}
                            className="w-32"
                          />
                          <Input
                            placeholder="Rest (sec)"
                            type="number"
                            value={currentSet.rest_seconds}
                            onChange={(e) => setCurrentSet(prev => ({ ...prev, rest_seconds: e.target.value }))}
                            className="w-28"
                          />
                          <Button 
                            onClick={() => addSetToExercise(workout.exercise_id)}
                            disabled={!currentSet.reps}
                            variant="gradient"
                          >
                            Add Set
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </CardContent>
              </Card>
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Dumbbell className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Active Workout</h3>
                <p className="text-muted-foreground text-center mb-4">
                  Start a new workout session to begin tracking your exercises
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          {workoutSessions.length > 0 ? (
            workoutSessions.map((session) => (
              <Card key={session.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="flex items-center gap-2">
                      <History className="h-5 w-5" />
                      {session.name || `Workout ${format(new Date(session.date), 'MMM dd, yyyy')}`}
                    </CardTitle>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      {session.duration_minutes && (
                        <div className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {session.duration_minutes}min
                        </div>
                      )}
                      <span>{format(new Date(session.date), 'MMM dd, yyyy')}</span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {(session as any).workout_sets?.map((set: any) => (
                      <div key={set.id} className="flex items-center gap-4 p-2 bg-muted rounded">
                        <span className="font-medium">{set.exercises?.name}</span>
                        <Badge variant="outline">Set {set.set_number}</Badge>
                        <span>{set.reps} reps</span>
                        {set.weight && <span>{set.weight} lbs</span>}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <History className="h-12 w-12 text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Workout History</h3>
                <p className="text-muted-foreground text-center">
                  Your completed workouts will appear here
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};