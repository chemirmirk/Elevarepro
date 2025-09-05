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
import { Dumbbell, Plus, History, Play, Check, Timer, RotateCcw, Target, Trash2 } from "lucide-react";
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

interface WorkoutPlan {
  id: string;
  name: string;
  exercises: Exercise[];
  description?: string;
}

interface ExerciseSet {
  id?: string;
  reps?: number;
  duration?: number;
  weight?: number;
  completed: boolean;
}

interface WorkoutExercise extends Exercise {
  sets: ExerciseSet[];
  targetSets: number;
  targetReps?: number;
  targetDuration?: number;
  isCompleted: boolean;
}

export const WorkoutPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [workoutSessions, setWorkoutSessions] = useState<WorkoutSession[]>([]);
  const [activeWorkout, setActiveWorkout] = useState<WorkoutExercise[]>([]);
  const [isWorkoutActive, setIsWorkoutActive] = useState(false);
  const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
  const [workoutStartTime, setWorkoutStartTime] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreatePlanDialog, setShowCreatePlanDialog] = useState(false);
  const [showCreateExerciseDialog, setShowCreateExerciseDialog] = useState(false);
  
  // Quick start templates
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  
  // New exercise form
  const [newExercise, setNewExercise] = useState({
    name: "",
    muscle_group: "",
    description: ""
  });

  // Workout plan form
  const [newPlan, setNewPlan] = useState({
    name: "",
    description: "",
    exercises: [] as string[]
  });

  // Predefined workout templates
  const workoutTemplates = {
    "push": {
      name: "Push Day",
      exercises: ["Push-ups", "Bench Press", "Shoulder Press", "Tricep Dips"],
      description: "Upper body pushing movements"
    },
    "pull": {
      name: "Pull Day", 
      exercises: ["Pull-ups", "Rows", "Lat Pulldown", "Bicep Curls"],
      description: "Upper body pulling movements"
    },
    "legs": {
      name: "Leg Day",
      exercises: ["Squats", "Deadlifts", "Lunges", "Calf Raises"],
      description: "Lower body strength and power"
    },
    "cardio": {
      name: "Cardio Blast",
      exercises: ["Burpees", "Mountain Climbers", "Jumping Jacks", "High Knees"],
      description: "High intensity cardio workout"
    }
  };

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

  const startWorkoutFromTemplate = (templateKey: string) => {
    const template = workoutTemplates[templateKey as keyof typeof workoutTemplates];
    if (!template) return;

    const workoutExercises = template.exercises.map(exerciseName => {
      const exercise = exercises.find(e => e.name.toLowerCase().includes(exerciseName.toLowerCase()));
      if (!exercise) return null;
      
      return {
        ...exercise,
        sets: [
          { completed: false },
          { completed: false },
          { completed: false }
        ],
        targetSets: 3,
        targetReps: exerciseName.includes("Cardio") ? undefined : 12,
        targetDuration: exerciseName.includes("Cardio") ? 30 : undefined,
        isCompleted: false
      } as WorkoutExercise;
    }).filter(Boolean) as WorkoutExercise[];

    startWorkout(template.name, workoutExercises);
  };

  const startCustomWorkout = () => {
    setActiveWorkout([]);
    setIsWorkoutActive(true);
    setWorkoutStartTime(new Date());
    startWorkoutSession("Custom Workout");
  };

  const startWorkout = async (workoutName: string, exercises: WorkoutExercise[] = []) => {
    try {
      const sessionId = await startWorkoutSession(workoutName);
      setActiveWorkout(exercises);
      setIsWorkoutActive(true);
      setWorkoutStartTime(new Date());
      setActiveSessionId(sessionId);
      
      toast({
        title: "Workout Started! 💪",
        description: `${workoutName} session has begun. Let's crush it!`
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

  const startWorkoutSession = async (name: string): Promise<string> => {
    const { data, error } = await supabase
      .from('workout_sessions')
      .insert({
        user_id: user?.id,
        name,
        date: new Date().toISOString().split('T')[0]
      })
      .select()
      .single();

    if (error) throw error;
    return data.id;
  };

  const addExerciseToWorkout = (exerciseId: string) => {
    const exercise = exercises.find(e => e.id === exerciseId);
    if (!exercise) return;

    const workoutExercise: WorkoutExercise = {
      ...exercise,
      sets: [
        { completed: false },
        { completed: false },
        { completed: false }
      ],
      targetSets: 3,
      targetReps: 12,
      isCompleted: false
    };

    setActiveWorkout(prev => [...prev, workoutExercise]);
  };

  const updateExerciseSet = (exerciseIndex: number, setIndex: number, updates: Partial<ExerciseSet>) => {
    setActiveWorkout(prev => 
      prev.map((exercise, eIndex) => 
        eIndex === exerciseIndex
          ? {
              ...exercise,
              sets: exercise.sets.map((set, sIndex) => 
                sIndex === setIndex ? { ...set, ...updates } : set
              )
            }
          : exercise
      )
    );
  };

  const markSetCompleted = async (exerciseIndex: number, setIndex: number) => {
    const exercise = activeWorkout[exerciseIndex];
    const set = exercise.sets[setIndex];
    
    if (!set.reps && !set.duration) {
      toast({
        title: "Add Details",
        description: "Please enter reps or duration before marking as complete",
        variant: "destructive"
      });
      return;
    }

    // Save to database
    try {
      const { error } = await supabase
        .from('workout_sets')
        .insert({
          user_id: user?.id,
          session_id: activeSessionId,
          exercise_id: exercise.id,
          set_number: setIndex + 1,
          reps: set.reps || null,
          weight: set.weight || null,
          rest_seconds: set.duration || null
        });

      if (error) throw error;

      updateExerciseSet(exerciseIndex, setIndex, { completed: true });
      
      // Check if exercise is complete
      const updatedSets = [...exercise.sets];
      updatedSets[setIndex] = { ...set, completed: true };
      const allSetsCompleted = updatedSets.every(s => s.completed);
      
      if (allSetsCompleted) {
        setActiveWorkout(prev => 
          prev.map((ex, i) => 
            i === exerciseIndex ? { ...ex, isCompleted: true } : ex
          )
        );
        
        toast({
          title: "Exercise Complete! 🎉",
          description: `Great job on ${exercise.name}!`
        });
      }

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
    if (!workoutStartTime) return;

    try {
      const duration = Math.round((Date.now() - workoutStartTime.getTime()) / (1000 * 60));
      
      const { error } = await supabase
        .from('workout_sessions')
        .update({ duration_minutes: duration })
        .eq('id', activeSessionId);

      if (error) throw error;

      const completedExercises = activeWorkout.filter(ex => ex.isCompleted).length;
      const totalExercises = activeWorkout.length;

      setIsWorkoutActive(false);
      setActiveSessionId(null);
      setActiveWorkout([]);
      setWorkoutStartTime(null);
      loadWorkoutHistory();
      
      toast({
        title: "Workout Complete! 🎉",
        description: `Great job! You completed ${completedExercises}/${totalExercises} exercises in ${duration} minutes.`
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
      setShowCreateExerciseDialog(false);
      
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

  const getWorkoutProgress = () => {
    if (activeWorkout.length === 0) return 0;
    const completedExercises = activeWorkout.filter(ex => ex.isCompleted).length;
    return (completedExercises / activeWorkout.length) * 100;
  };

  const getExerciseProgress = (exercise: WorkoutExercise) => {
    const completedSets = exercise.sets.filter(set => set.completed).length;
    return (completedSets / exercise.sets.length) * 100;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center space-y-4">
        <div className="flex items-center justify-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-primary/10">
            <Dumbbell className="h-6 w-6 text-primary" />
          </div>
          <h1 className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Workout Tracker
          </h1>
        </div>
        
        {isWorkoutActive && (
          <div className="flex items-center justify-center gap-4 p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {workoutStartTime && `${Math.round((Date.now() - workoutStartTime.getTime()) / (1000 * 60))} min`}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">
                {activeWorkout.filter(ex => ex.isCompleted).length}/{activeWorkout.length} exercises
              </span>
            </div>
            <Progress value={getWorkoutProgress()} className="w-24 h-2" />
          </div>
        )}
      </div>

      {isWorkoutActive ? (
        /* Active Workout View */
        <div className="space-y-6">
          {/* Workout Controls */}
          <div className="flex flex-col sm:flex-row gap-3 justify-between items-center p-4 rounded-lg border bg-card">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-500" />
              <span className="font-semibold">Active Workout</span>
            </div>
            <div className="flex gap-2">
              <Dialog open={showCreateExerciseDialog} onOpenChange={setShowCreateExerciseDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Exercise
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Exercise to Workout</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <Select onValueChange={addExerciseToWorkout}>
                      <SelectTrigger>
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
                  </div>
                </DialogContent>
              </Dialog>
              <Button onClick={finishWorkout} variant="gradient">
                Finish Workout
              </Button>
            </div>
          </div>

          {/* Exercise Cards */}
          <div className="grid gap-4">
            {activeWorkout.map((exercise, exerciseIndex) => (
              <Card key={exercise.id} className={`transition-all ${exercise.isCompleted ? 'opacity-75 bg-green-50 border-green-200' : ''}`}>
                <CardHeader className="pb-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${exercise.isCompleted ? 'bg-green-100' : 'bg-primary/10'}`}>
                        {exercise.isCompleted ? (
                          <Check className="h-4 w-4 text-green-600" />
                        ) : (
                          <Dumbbell className="h-4 w-4 text-primary" />
                        )}
                      </div>
                      <div>
                        <CardTitle className="text-lg">{exercise.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">{exercise.muscle_group}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Progress value={getExerciseProgress(exercise)} className="w-16 h-2 mb-1" />
                      <p className="text-xs text-muted-foreground">
                        {exercise.sets.filter(s => s.completed).length}/{exercise.sets.length} sets
                      </p>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {exercise.sets.map((set, setIndex) => (
                    <div key={setIndex} className={`flex items-center gap-3 p-3 rounded-lg border ${set.completed ? 'bg-green-50 border-green-200' : 'bg-muted/30'}`}>
                      <Badge variant={set.completed ? "default" : "outline"} className="min-w-[60px]">
                        Set {setIndex + 1}
                      </Badge>
                      
                      {!set.completed ? (
                        <>
                          <div className="flex gap-2 flex-1">
                            <Input
                              placeholder="Reps"
                              type="number"
                              value={set.reps || ""}
                              onChange={(e) => updateExerciseSet(exerciseIndex, setIndex, { reps: parseInt(e.target.value) || undefined })}
                              className="w-20"
                            />
                            <Input
                              placeholder="Weight"
                              type="number"
                              step="0.25"
                              value={set.weight || ""}
                              onChange={(e) => updateExerciseSet(exerciseIndex, setIndex, { weight: parseFloat(e.target.value) || undefined })}
                              className="w-24"
                            />
                          </div>
                          <Button
                            onClick={() => markSetCompleted(exerciseIndex, setIndex)}
                            disabled={!set.reps && !set.duration}
                            size="sm"
                            variant="gradient"
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        </>
                      ) : (
                        <div className="flex items-center gap-4 flex-1">
                          <span className="text-sm font-medium">{set.reps} reps</span>
                          {set.weight && <span className="text-sm">{set.weight} lbs</span>}
                          <Check className="h-4 w-4 text-green-600 ml-auto" />
                        </div>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {activeWorkout.length === 0 && (
            <Card>
              <CardContent className="text-center py-12">
                <Dumbbell className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">Add Exercises</h3>
                <p className="text-muted-foreground mb-4">Start adding exercises to build your workout</p>
                <Button onClick={() => setShowCreateExerciseDialog(true)} variant="gradient">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Exercise
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      ) : (
        /* Workout Selection View */
        <div className="space-y-6">
          {/* Quick Start Templates */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Quick Start Templates
              </CardTitle>
              <p className="text-sm text-muted-foreground">Choose a pre-built workout plan to get started quickly</p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(workoutTemplates).map(([key, template]) => (
                  <Card key={key} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">{template.name}</h4>
                        <Button
                          onClick={() => startWorkoutFromTemplate(key)}
                          size="sm"
                          variant="gradient"
                        >
                          Start
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{template.description}</p>
                      <div className="flex flex-wrap gap-1">
                        {template.exercises.slice(0, 3).map((exercise, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {exercise}
                          </Badge>
                        ))}
                        {template.exercises.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{template.exercises.length - 3} more
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Custom Workout */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                Custom Workout
              </CardTitle>
              <p className="text-sm text-muted-foreground">Build your own workout from scratch</p>
            </CardHeader>
            <CardContent>
              <Button onClick={startCustomWorkout} variant="outline" className="w-full">
                Start Custom Workout
              </Button>
            </CardContent>
          </Card>

          {/* Workout History */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <History className="h-5 w-5" />
                Recent Workouts
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {workoutSessions.length > 0 ? (
                <div className="space-y-3">
                  {workoutSessions.slice(0, 5).map((session) => (
                    <div key={session.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium truncate">{session.name || `Workout ${format(new Date(session.date), 'MMM dd')}`}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          <p className="text-sm text-muted-foreground">
                            {format(new Date(session.date), 'MMM dd, yyyy')}
                          </p>
                          {session.duration_minutes && (
                            <div className="flex items-center gap-1">
                              <Timer className="h-3 w-3 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">{session.duration_minutes} min</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge variant="outline" className="whitespace-nowrap">
                          {(session as any).workout_sets?.length || 0} exercises
                        </Badge>
                      </div>
                    </div>
                  ))}
                  
                  {workoutSessions.length > 5 && (
                    <div className="text-center pt-2">
                      <Button variant="ghost" size="sm" className="text-muted-foreground">
                        View All Workouts
                      </Button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="p-3 rounded-full bg-muted/50 w-fit mx-auto mb-4">
                    <History className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h4 className="font-medium mb-2">No workouts yet</h4>
                  <p className="text-sm text-muted-foreground mb-4">Start your first workout above to see your history here</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Exercise Dialog */}
      <Dialog open={showCreateExerciseDialog} onOpenChange={setShowCreateExerciseDialog}>
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
  );
};