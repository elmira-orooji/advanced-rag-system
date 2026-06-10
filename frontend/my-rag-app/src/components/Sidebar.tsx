import {
  Plus,
  MessageSquare,
  Upload,
  Trash2,
  Database,
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
  const currentUser = JSON.parse(
  localStorage.getItem("current-user") ?? "null"
);
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
      <div className="flex items-center gap-3">
        <Database className="text-blue-500" />

        <span className="hidden lg:block font-bold text-lg">
          KnowledgeFlow AI
        </span>
      </div>
    </div>

    {/* New Chat */}
    <div className="p-4">
      <button
        onClick={onNewChat}
        className="
          w-full
          flex
          items-center
          justify-center
          lg:justify-start
          gap-3
          rounded-xl
          bg-blue-600
          hover:bg-blue-700
          text-white
          px-4
          py-3
          transition
        "
      >
        <Plus size={18} />

        <span className="hidden lg:block">
          New Chat
        </span>
      </button>
    </div>

    {/* Recent Chats */}
    <div className="flex-1 overflow-y-auto px-3">
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
                  : "bg-blue-100"
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

            <span className="hidden lg:block truncate text-sm">
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
  <Upload size={18} />

  <span className="hidden lg:block">
    Upload Documents
  </span>
</button>

{[
  {
    icon: Upload,
    label: "Upload Documents",
    adminOnly: true,
  },

]
  .filter(
    (item) =>
      !item.adminOnly ||
      currentUser?.role === "admin"
  )
  .map(({ icon: Icon, label }) => (
    <button
      key={label}
      onClick={() => {
        if (
          label ===
          "Upload Documents"
        ) {
          onOpenUpload();
        }
      }}
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
      <Icon size={18} />

      <span className="hidden lg:block">
        {label}
      </span>
    </button>
  ))}
    </div>
  </aside>
)};