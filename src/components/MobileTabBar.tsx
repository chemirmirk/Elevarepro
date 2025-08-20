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
    <div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border">
      <div className="flex justify-around py-2">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => onTabChange(id)}
            className={cn(
              "flex flex-col items-center p-2 rounded-lg transition-all duration-200",
              "min-w-0 flex-1 max-w-[80px]",
              activeTab === id
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Icon className={cn("h-5 w-5 mb-1", activeTab === id && "animate-bounce-gentle")} />
            <span className="text-xs font-medium truncate">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};