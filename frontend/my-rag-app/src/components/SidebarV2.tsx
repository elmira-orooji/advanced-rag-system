import {
  Home,
  Sparkles,
  CheckSquare,
  Calendar,
  FileText,
  Share2,
  Settings,
  MoreHorizontal,
  ChevronsLeft,
  
} from "lucide-react";
import type { ChatSession } from "../types/chat";

interface SidebarV2Props {
  sessions: ChatSession[];

  activeSessionId: string | null;

  onSelectChat: (id: string) => void;

  onNewChat: () => void;
}

export default function SidebarV2({

  onNewChat,
}: SidebarV2Props){
  return (
    <aside
      className="
        w-[280px]
        h-screen
        bg-white
        border-r
        border-slate-200
        flex
        flex-col
      "
    >
        
      {/* Profile */}
      <div className="flex items-center px-6 py-6">
        <div className="flex items-center gap-3">
          <img
            src="https://i.pravatar.cc/40"
            alt="User"
            className="w-10 h-10 rounded-full"
          />

          <span className="font-semibold text-slate-900">
            Sam Smith
          </span>
        </div>
        <button className="ml-auto">
            <ChevronsLeft
            size={18}
            className="text-slate-300"
            />
        </button>
      </div>

      {/* Menu */}
      <div className="px-4 space-y-2">
        {[
          {
            icon: Home,
            label: "Home",
            active: true,
          },
          {
            icon: Sparkles,
            label: "New Chat",
            onClick: onNewChat,
          },
          {
            icon: CheckSquare,
            label: "My Tasks",
          },
          {
            icon: Calendar,
            label: "My Meetings",
          },
          {
            icon: FileText,
            label: "Saved Files",
          },
          {
            icon: Share2,
            label: "Shared with me",
          },
        ].map(
            ({
                icon: Icon,
                label,
                active,
                onClick,
            }) => (
            <button
              key={label}
              onClick={onClick}
              className={`
                w-full
                flex
                items-center
                justify-between
                px-4
                py-3
                rounded-2xl
                transition

                ${
                  active
                    ? "bg-slate-100 text-slate-900"
                    : "hover:bg-slate-50 text-slate-500"
                }
              `}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} />

                <span>{label}</span>
              </div>
            </button>
          )
        )}
      </div>

<div className="mt-8">
  <p className="px-6 text-sm text-slate-400 mb-4">
    Today
  </p>

  <div className="space-y-4 px-6">
    <p>Research Assistance Request</p>
    <p>Summarizing Last Meeting</p>
    <p>Prioritizing Tasks Request</p>
  </div>

  <p className="px-6 text-sm text-slate-400 mt-8 mb-4">
    Yesterday
  </p>

  <div className="px-6">
    <p>Document Summary Request</p>
  </div>
</div>
      {/* Settings */}
      <div className="px-6 py-6 border-t border-slate-200">
        <button
          className="
            w-full
            flex
            items-center
            justify-between
            text-slate-500
          "
        >
          <div className="flex items-center gap-3">
            <Settings size={18} />

            <span>Settings</span>
          </div>

          <MoreHorizontal size={18} />
        </button>
      </div>
    </aside>
  );
}