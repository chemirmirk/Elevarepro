import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { MobileTabBar } from "@/components/MobileTabBar";
import { DashboardPage } from "@/components/DashboardPage";
import { CheckinPage } from "@/components/CheckinPage";
import { RemindersPage } from "@/components/RemindersPage";
import { CalendarPage } from "@/components/CalendarPage";
import { PhotosPage } from "@/components/PhotosPage";
import { ChatPage } from "@/components/ChatPage";
import { OnboardingFlow } from "@/components/OnboardingFlow";
import { Button } from "@/components/ui/button";
import { LogOut, User } from "lucide-react";

const Index = () => {
  const { user, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOnboarded, setIsOnboarded] = useState(false);

  const handleOnboardingComplete = (data: any) => {
    console.log('Onboarding completed with data:', data);
    setIsOnboarded(true);
  };

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
