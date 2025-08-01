import { useState } from "react";
import { MobileTabBar } from "@/components/MobileTabBar";
import { DashboardPage } from "@/components/DashboardPage";
import { CheckinPage } from "@/components/CheckinPage";
import { RemindersPage } from "@/components/RemindersPage";
import { CalendarPage } from "@/components/CalendarPage";
import { PhotosPage } from "@/components/PhotosPage";
import { ChatPage } from "@/components/ChatPage";
import { OnboardingFlow } from "@/components/OnboardingFlow";

const Index = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isOnboarded, setIsOnboarded] = useState(false);

  const handleOnboardingComplete = (data: any) => {
    console.log('Onboarding completed with data:', data);
    setIsOnboarded(true);
  };

  if (!isOnboarded) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />;
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
      {renderActiveTab()}
      <MobileTabBar activeTab={activeTab} onTabChange={setActiveTab} />
    </div>
  );
};

export default Index;
