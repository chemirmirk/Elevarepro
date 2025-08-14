import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Target, Dumbbell, Cigarette, ArrowRight, ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface OnboardingData {
  challenges: string[];
  goals: {
    gym?: { frequency: number; currentLevel: string };
    smoking?: { currentAmount: number; targetAmount: number; timeframe: string };
  };
  motivation: string;
  previousAttempts: string;
  currentHabits: string;
}

interface OnboardingFlowProps {
  onComplete: (data: OnboardingData) => void;
}

const challenges = [
  { id: 'gym', label: 'Gym Consistency', icon: Dumbbell, description: 'Build a regular workout routine' },
  { id: 'smoking', label: 'Smoking Cessation', icon: Cigarette, description: 'Quit or reduce smoking' }
];

export const OnboardingFlow = ({ onComplete }: OnboardingFlowProps) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    challenges: [],
    goals: {},
    motivation: '',
    previousAttempts: '',
    currentHabits: ''
  });

  const totalSteps = 4;
  const progress = (currentStep / totalSteps) * 100;

  const toggleChallenge = (challengeId: string) => {
    setData(prev => ({
      ...prev,
      challenges: prev.challenges.includes(challengeId)
        ? prev.challenges.filter(id => id !== challengeId)
        : [...prev.challenges, challengeId]
    }));
  };

  const updateGoal = (challenge: string, goalData: any) => {
    setData(prev => ({
      ...prev,
      goals: {
        ...prev.goals,
        [challenge]: goalData
      }
    }));
  };

  const saveOnboardingData = async () => {
    if (!user) return;
    
    try {
      setIsSubmitting(true);
      
      const { error } = await supabase
        .from('onboarding_data')
        .upsert({
          user_id: user.id,
          challenges: data.challenges,
          goals: data.goals,
          motivation: data.motivation,
          previous_attempts: data.previousAttempts,
          current_habits: data.currentHabits
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      
      // Set up smoking cessation reminders if user selected smoking challenge
      if (data.challenges.includes('smoking') && data.goals.smoking) {
        console.log('Setting up smoking reminders...');
        
        const { error: reminderError } = await supabase.functions.invoke('setup-smoking-reminders', {
          body: {
            userId: user.id,
            smokingGoal: data.goals.smoking
          }
        });

        if (reminderError) {
          console.error('Error setting up smoking reminders:', reminderError);
          // Don't fail the onboarding if reminders fail
        } else {
          console.log('Smoking reminders set up successfully');
        }
      }
      
      toast.success("Onboarding completed successfully!");
      onComplete(data);
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      toast.error("Failed to save onboarding data. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      saveOnboardingData();
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return data.challenges.length > 0;
      case 2:
        return data.challenges.every(challenge => data.goals[challenge as keyof typeof data.goals]);
      case 3:
        return data.motivation.trim().length > 0;
      case 4:
        return data.previousAttempts.trim().length > 0 && data.currentHabits.trim().length > 0;
      default:
        return false;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-hero flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-card">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold text-primary">
            Welcome to DisciplineBoost! 🚀
          </CardTitle>
          <p className="text-muted-foreground">
            Let's personalize your journey to better habits
          </p>
          <div className="mt-4">
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground mt-2">
              Step {currentStep} of {totalSteps}
            </p>
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* Step 1: Challenge Selection */}
          {currentStep === 1 && (
            <div className="space-y-4 animate-slide-up">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">What challenges do you want to overcome?</h3>
                <p className="text-sm text-muted-foreground">Select all that apply</p>
              </div>
              
              <div className="space-y-3">
                {challenges.map((challenge) => {
                  const Icon = challenge.icon;
                  const isSelected = data.challenges.includes(challenge.id);
                  
                  return (
                    <button
                      key={challenge.id}
                      onClick={() => toggleChallenge(challenge.id)}
                      className={`w-full p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                        isSelected 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          isSelected ? 'bg-primary text-white' : 'bg-muted'
                        }`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <h4 className="font-semibold">{challenge.label}</h4>
                          <p className="text-sm text-muted-foreground">{challenge.description}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle className="h-5 w-5 text-primary" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Goal Setting */}
          {currentStep === 2 && (
            <div className="space-y-6 animate-slide-up">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Set your specific goals</h3>
                <p className="text-sm text-muted-foreground">Be specific and realistic</p>
              </div>

              {data.challenges.includes('gym') && (
                <Card className="border border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Dumbbell className="h-5 w-5 text-primary" />
                      Gym Consistency Goal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <label className="text-sm font-medium">How many times per week?</label>
                      <Input
                        type="number"
                        min="1"
                        max="7"
                        value={data.goals.gym?.frequency || ''}
                        onChange={(e) => updateGoal('gym', {
                          ...data.goals.gym,
                          frequency: parseInt(e.target.value) || 0
                        })}
                        placeholder="e.g., 3"
                        className="mt-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Current fitness level</label>
                      <select 
                        value={data.goals.gym?.currentLevel || ''}
                        onChange={(e) => updateGoal('gym', {
                          ...data.goals.gym,
                          currentLevel: e.target.value
                        })}
                        className="w-full mt-1 p-2 border border-border rounded-md bg-background"
                      >
                        <option value="">Select level...</option>
                        <option value="beginner">Beginner (new to exercise)</option>
                        <option value="intermediate">Intermediate (some experience)</option>
                        <option value="advanced">Advanced (regular exerciser)</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>
              )}

              {data.challenges.includes('smoking') && (
                <Card className="border border-primary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-lg">
                      <Target className="h-5 w-5 text-success" />
                      Smoking Cessation Goal
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Current daily amount</label>
                        <Input
                          type="number"
                          min="0"
                          value={data.goals.smoking?.currentAmount || ''}
                          onChange={(e) => updateGoal('smoking', {
                            ...data.goals.smoking,
                            currentAmount: parseInt(e.target.value) || 0
                          })}
                          placeholder="e.g., 10"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Target amount</label>
                        <Input
                          type="number"
                          min="0"
                          value={data.goals.smoking?.targetAmount === undefined ? '' : data.goals.smoking.targetAmount.toString()}
                          onChange={(e) => updateGoal('smoking', {
                            ...data.goals.smoking,
                            targetAmount: e.target.value === '' ? undefined : parseInt(e.target.value)
                          })}
                          placeholder="e.g., 0"
                          className="mt-1"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Target timeframe</label>
                      <select 
                        value={data.goals.smoking?.timeframe || ''}
                        onChange={(e) => updateGoal('smoking', {
                          ...data.goals.smoking,
                          timeframe: e.target.value
                        })}
                        className="w-full mt-1 p-2 border border-border rounded-md bg-background"
                      >
                        <option value="">Select timeframe...</option>
                        <option value="1-month">1 month</option>
                        <option value="3-months">3 months</option>
                        <option value="6-months">6 months</option>
                        <option value="1-year">1 year</option>
                      </select>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {/* Step 3: Motivation */}
          {currentStep === 3 && (
            <div className="space-y-4 animate-slide-up">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">What motivates you?</h3>
                <p className="text-sm text-muted-foreground">Tell us why these changes matter to you</p>
              </div>

              <Textarea
                value={data.motivation}
                onChange={(e) => setData(prev => ({ ...prev, motivation: e.target.value }))}
                placeholder="e.g., I want to feel healthier, have more energy, set a good example for my kids..."
                className="min-h-[120px]"
              />

              <div className="p-3 bg-primary/5 rounded-lg">
                <p className="text-xs text-muted-foreground">
                  💡 Tip: The more specific and personal your motivation, the more likely you are to succeed when things get tough.
                </p>
              </div>
            </div>
          )}

          {/* Step 4: Previous Attempts & Current Habits */}
          {currentStep === 4 && (
            <div className="space-y-6 animate-slide-up">
              <div className="text-center">
                <h3 className="text-lg font-semibold mb-2">Tell us about your journey</h3>
                <p className="text-sm text-muted-foreground">This helps us provide better support</p>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Previous attempts and what happened</label>
                <Textarea
                  value={data.previousAttempts}
                  onChange={(e) => setData(prev => ({ ...prev, previousAttempts: e.target.value }))}
                  placeholder="e.g., Tried going to gym last year but stopped after 2 months due to work stress..."
                  className="min-h-[80px]"
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Current habits and routine</label>
                <Textarea
                  value={data.currentHabits}
                  onChange={(e) => setData(prev => ({ ...prev, currentHabits: e.target.value }))}
                  placeholder="e.g., Wake up at 7am, work 9-5, usually eat dinner at home, go to bed around 11pm..."
                  className="min-h-[80px]"
                />
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between pt-4">
            <Button
              onClick={prevStep}
              variant="outline"
              disabled={currentStep === 1}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>

            <Button
              onClick={nextStep}
              disabled={!canProceed() || isSubmitting}
              className="flex items-center gap-2 gradient-primary shadow-primary text-white"
            >
              {isSubmitting ? 'Saving...' : currentStep === totalSteps ? 'Complete Setup' : 'Next'}
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};