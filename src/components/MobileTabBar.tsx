import { Home, CheckCircle, Camera, MessageCircle, Target } from "lucide-react";
import { cn } from "@/lib/utils";

interface MobileTabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
  { id: 'dashboard', label: 'Home', icon: Home },
  { id: 'checkin', label: 'Check-in', icon: CheckCircle },
  { id: 'goals', label: 'Goals', icon: Target },
  { id: 'photos', label: 'Photos', icon: Camera },
  { id: 'chat', label: 'Chat', icon: MessageCircle },
];

export const MobileTabBar = ({ activeTab, onTabChange }: MobileTabBarProps) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 glass-card border-t shadow-large">
      <div className="flex justify-around py-3 px-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              "flex flex-col items-center p-3 rounded-2xl transition-all duration-300 hover-lift",
              "min-w-0 flex-1 max-w-[80px] relative",
              activeTab === id
                ? "text-primary bg-primary/10 shadow-soft"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <Icon className={cn(
              "h-5 w-5 mb-1 transition-all duration-200", 
              activeTab === id && "scale-110 animate-bounce-gentle"
            )} />
            <span className={cn(
              "text-xs font-medium truncate transition-colors duration-200",
              activeTab === id && "font-semibold"
            )}>{label}</span>
            {activeTab === id && (
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-primary rounded-full animate-pulse" />
            )}
          </button>
        ))}
      </div>
    </div>
  );
};