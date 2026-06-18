import {
  Home,
  Plus,
  CheckSquare,
  FileText,
  Users,
  Settings,
  MessageSquare,
  Trash2,
 
} from "lucide-react";

import type {
  ChatSession,
} from "../types/chat";

interface SidebarProps {
  darkMode: boolean;

  sessions: ChatSession[];

  activeSessionId: string | null;

  onSelectChat: (id: string) => void;

  onNewChat: () => void;

  onDeleteChat: (id: string) => void;

  onOpenUpload: () => void;
}

export default function Sidebar({
  darkMode,
  sessions,
  activeSessionId,
  onSelectChat,
  onNewChat,
  onDeleteChat,
  onOpenUpload,
}: SidebarProps) {

    return (
  <aside
    className={`
      w-20 lg:w-72
      border-r
      flex
      flex-col
      transition-all
      ${
        darkMode
          ? "bg-slate-900 border-slate-800"
          : "bg-white border-slate-200"
      }
    `}
  >
    {/* Header */}
    <div className="p-5 border-b border-inherit">
<div className="px-6 py-8">
  <div className="flex items-center gap-4">


<div className="flex items-center justify-between px-6 py-6">

  <div className="flex items-center gap-3">

    <img
      src="https://i.pravatar.cc/40"
      className="w-10 h-10 rounded-full"
    />

    <span className="font-semibold text-slate-800">
      Lara Smith
    </span>

  </div>

  <button className="text-slate-400">
    ≪
  </button>

</div>
      </div>
    </div>
    </div>

    {/* Recent Chats */}
    <div className="flex-1 overflow-y-auto px-3">
      <div className="px-3 space-y-1">
  {[
    {
      icon: Home,
      label: "Home",
    },
    {
      icon: Plus,
      label: "New Chat",
      onClick: onNewChat,
    },
    {
      icon: CheckSquare,
      label: "My Tasks",
    },
    {
      icon: FileText,
      label: "Saved Files",
    },
    {
      icon: Users,
      label: "Shared with me",
    },
  ].map(
    ({
      icon: Icon,
      label,
      onClick,
    }) => (
      <button
        key={label}
        onClick={onClick}
        className="
          flex
          w-full
          items-center
          gap-3
          rounded-xl
          px-4
          py-3
          text-left
          text-slate-700
          transition
          hover:bg-slate-800
          hover:text-white
        "
      >
        <Icon size={18} />

        <span>{label}</span>
      </button>
    )
  )}
</div>
      <p className="hidden lg:block text-xs uppercase text-slate-500 mb-3 px-2">
        
        Recent Chats
      </p>

      {sessions.map((chat) => (
        <div
          key={chat.id}
          className={`
            group
            flex
            items-center
            justify-between
            rounded-xl
            px-3
            py-3
            cursor-pointer
            mb-2
            transition

            ${
              activeSessionId === chat.id
                ? darkMode
                  ? "bg-blue-600 text-white"
                  : "bg-blue-100 dark:bg-blue-500/15"
                : darkMode
                ? "hover:bg-slate-800"
                : "hover:bg-slate-100"
            }
          `} 
        >
          <div
            onClick={() =>
              onSelectChat(chat.id)
            }
            className="
              flex
              items-center
              gap-3
              flex-1
              min-w-0
            "
          >
            <MessageSquare size={18} />

            <span className="truncate text-sm">
              {chat.title}
            </span>
          </div>

          <button
            onClick={() =>
              onDeleteChat(chat.id)
            }
            className="
              hidden
              lg:flex
              opacity-0
              group-hover:opacity-100
              transition
            "
          >
            <Trash2 size={16} />
          </button>
        </div>
      ))}
    </div>

    {/* Footer */}
    <div className="p-3 border-t border-inherit">
<button
  onClick={() =>
    {onOpenUpload}
  }
  className="
    w-full
    flex
    items-center
    justify-center
    lg:justify-start
    gap-3
    px-4
    py-3
    rounded-xl
    hover:bg-blue-500/10
    transition
  "
>

</button>
<div className="mt-auto border-t border-slate-800 p-4">
  <button
    className="
      flex
      w-full
      items-center
      gap-3
      rounded-xl
      px-4
      py-3
      text-slate-700
      transition
      hover:bg-slate-800
      hover:text-white
    "
  >
    <Settings size={18} />

    <span>Settings</span>
  </button>
</div>
    </div>
  </aside>
)};