import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { MobileTabBar } from "@/components/MobileTabBar";
import { DashboardPage } from "@/components/DashboardPage";
import { CheckinPage } from "@/components/CheckinPage";
import { RemindersPage } from "@/components/RemindersPage";
import { CalendarPage } from "@/components/CalendarPage";
import { PhotosPage } from "@/components/PhotosPage";
import { ChatPage } from "@/components/ChatPage";
import { GoalsPage } from "@/components/GoalsPage";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOnboarded, setIsOnboarded] = useState(false);
  const [loading, setLoading] = useState(true);

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
          <div className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            <span className="text-sm text-muted-foreground">
              Welcome, {user?.user_metadata?.name || user?.email}
            </span>
          </div>
          <Button variant="outline" size="sm" onClick={signOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
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
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <span className="text-sm text-muted-foreground">
            Welcome, {user?.user_metadata?.name || user?.email}
          </span>
        </div>
        <Button variant="outline" size="sm" onClick={signOut}>
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </Button>
      </div>
      {renderActiveTab()}
      <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
