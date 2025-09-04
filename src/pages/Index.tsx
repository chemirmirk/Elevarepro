import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useProfile } from "@/hooks/useProfile";
import { supabase } from "@/integrations/supabase/client";
import { MobileTabBar } from "@/components/MobileTabBar";
import { DashboardPage } from "@/components/DashboardPage";
import { CheckinPage } from "@/components/CheckinPage";
import { RemindersPage } from "@/components/RemindersPage";
import { CalendarPage } from "@/components/CalendarPage";
import { PhotosPage } from "@/components/PhotosPage";
import { ChatPage } from "@/components/ChatPage";
import { GoalsPage } from "@/components/GoalsPage";
import { WorkoutPage } from "@/components/WorkoutPage";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { ProfilePictureUpload } from "@/components/ProfilePictureUpload";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { LogOut, User, Settings, Calendar, Bell, Dumbbell } from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();
  const { profile, updateProfile } = useProfile();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [profileDialogOpen, setProfileDialogOpen] = useState(false);
  const [editName, setEditName] = useState('');

  useEffect(() => {
    const checkOnboardingStatus = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('onboarding_data')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) {
          console.error('Error checking onboarding status:', error);
          setIsOnboarded(false);
        } else if (data) {
          setIsOnboarded(true);
        } else {
          setIsOnboarded(false);
        }
      } catch (error) {
        console.error('Unexpected error:', error);
        setIsOnboarded(false);
      } finally {
        setLoading(false);
      }
    };

    checkOnboardingStatus();
  }, [user]);

  useEffect(() => {
    if (profile?.name) {
      setEditName(profile.name);
    }
  }, [profile]);

  const handleProfileImageUpdate = (newImageUrl: string | null) => {
    if (profile) {
      // Update the local profile state immediately for better UX
      // The actual database update is handled by the ProfilePictureUpload component
    }
  };

  const handleNameUpdate = async () => {
    try {
      await updateProfile({ name: editName.trim() });
      setProfileDialogOpen(false);
    } catch (error) {
      console.error('Error updating name:', error);
    }
  };

  const handleOnboardingComplete = (data: any) => {
    console.log('Onboarding completed with data:', data);
    setIsOnboarded(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isOnboarded) {
    return (
      <div className="min-h-screen bg-background">
        {/* User info header */}
        <div className="flex justify-between items-center p-4 border-b bg-card">
          <div className="flex items-center gap-3">
            <ProfilePictureUpload
              currentImageUrl={profile?.profile_picture_url}
              onImageUpdate={handleProfileImageUpdate}
              size="sm"
            />
            <span className="text-sm text-muted-foreground">
              Welcome, {profile?.name || user?.user_metadata?.name || user?.email}
            </span>
          </div>
        <div className="flex items-center gap-2">
          <Button
            variant={activeTab === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('calendar')}
            className="hidden sm:flex"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={activeTab === 'reminders' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('reminders')}
            className="hidden sm:flex"
          >
            <Bell className="h-4 w-4 mr-2" />
            Reminders
          </Button>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
        </div>
        <OnboardingFlow onComplete={handleOnboardingComplete} />
      </div>
    );
  }

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardPage />;
      case 'checkin':
        return <CheckinPage />;
      case 'goals':
        return <GoalsPage />;
      case 'workout':
        return <WorkoutPage />;
      case 'reminders':
        return <RemindersPage />;
      case 'calendar':
        return <CalendarPage />;
      case 'photos':
        return <PhotosPage />;
      case 'chat':
        return <ChatPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* User info header */}
      <div className="flex justify-between items-center p-4 border-b bg-card">
        <div className="flex items-center gap-3">
          <Dialog open={profileDialogOpen} onOpenChange={setProfileDialogOpen}>
            <DialogTrigger asChild>
              <button className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-full">
                <ProfilePictureUpload
                  currentImageUrl={profile?.profile_picture_url}
                  onImageUpdate={handleProfileImageUpdate}
                  size="sm"
                />
              </button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Profile</DialogTitle>
              </DialogHeader>
              <div className="space-y-6">
                <div className="flex justify-center">
                  <ProfilePictureUpload
                    currentImageUrl={profile?.profile_picture_url}
                    onImageUpdate={handleProfileImageUpdate}
                    size="lg"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Display Name</Label>
                  <Input
                    id="name"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    placeholder="Enter your name"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setProfileDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleNameUpdate}>
                    Save Changes
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
          <span className="text-sm text-muted-foreground">
            Welcome, {profile?.name || user?.user_metadata?.name || user?.email}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {/* Desktop buttons with text */}
          <Button
            variant={activeTab === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('calendar')}
            className="hidden md:flex"
          >
            <Calendar className="h-4 w-4 mr-2" />
            Calendar
          </Button>
          <Button
            variant={activeTab === 'workout' ? 'gradient' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('workout')}
            className="hidden md:flex"
          >
            <Dumbbell className="h-4 w-4 mr-2" />
            Workout
          </Button>
          <Button
            variant={activeTab === 'reminders' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('reminders')}
            className="hidden md:flex"
          >
            <Bell className="h-4 w-4 mr-2" />
            Reminders
          </Button>
          
          {/* Mobile icon-only buttons */}
          <Button
            variant={activeTab === 'calendar' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('calendar')}
            className="md:hidden p-2"
          >
            <Calendar className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTab === 'workout' ? 'gradient' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('workout')}
            className="md:hidden p-2"
          >
            <Dumbbell className="h-4 w-4" />
          </Button>
          <Button
            variant={activeTab === 'reminders' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab('reminders')}
            className="md:hidden p-2"
          >
            <Bell className="h-4 w-4" />
          </Button>
          
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Sign Out</span>
          </Button>
        </div>
      </div>
      {renderActiveTab()}
      <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
