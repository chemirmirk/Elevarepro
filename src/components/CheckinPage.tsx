import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Heart, CheckCircle, MessageSquare, Target, TrendingUp, Calendar } from "lucide-react";

const moodEmojis = [
  { value: 1, emoji: "😢", label: "Very Bad", color: "text-red-500" },
  { value: 2, emoji: "😕", label: "Bad", color: "text-orange-500" },
  { value: 3, emoji: "😐", label: "Okay", color: "text-yellow-500" },
  { value: 4, emoji: "😊", label: "Good", color: "text-blue-500" },
  { value: 5, emoji: "😄", label: "Great", color: "text-green-500" },
];

export const CheckinPage = () => {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [progressNotes, setProgressNotes] = useState("");
  const [goalsAchieved, setGoalsAchieved] = useState("");
  const [challengesFaced, setChallengesFaced] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentStreak = 7;
  const moodData = [3, 4, 3, 5, 4, 4, 4]; // Last 7 days

  const handleSubmit = async () => {
    if (!selectedMood || !progressNotes.trim() || !goalsAchieved.trim() || !challengesFaced.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubmitting(false);
    
    // Reset form
    setSelectedMood(null);
    setProgressNotes("");
    setGoalsAchieved("");
    setChallengesFaced("");
    
    // Show success feedback (will implement with toast later)
  };

  const isFormValid = selectedMood && progressNotes.trim() && goalsAchieved.trim() && challengesFaced.trim();

  return (
    <div className="p-4 pb-24 space-y-6 max-w-md mx-auto">
      {/* Header */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold mb-2">Daily Check-in</h1>
        <p className="text-muted-foreground">How was your day? Let's track your progress</p>
      </div>

      {/* Streak Counter */}
      <Card className="gradient-primary text-white shadow-primary">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-white/20 rounded-full">
                <CheckCircle className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm opacity-90">Check-in Streak</p>
                <p className="text-xl font-bold">{currentStreak} days</p>
              </div>
            </div>
            <Badge className="bg-white/20 text-white border-white/30">
              Keep it up!
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
            <div className="flex items-end gap-1 h-8">
              {moodData.map((mood, index) => (
                <div
                  key={index}
                  className="flex-1 bg-secondary rounded-sm"
                  style={{ height: `${(mood / 5) * 100}%` }}
                ></div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

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
          {isSubmitting ? "Saving..." : "Complete Check-in"}
        </Button>
      </div>
    </div>
  );
};