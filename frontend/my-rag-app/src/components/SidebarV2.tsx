import {
  Home,
  Sparkles,
  CheckSquare,
  Calendar,
  FileText,
  Share2,
  Settings,
  MoreHorizontal,
  ChevronLeft,
} from "lucide-react";

export default function SidebarV2() {
  return (
    <aside
      className="
        w-80
        h-screen
        bg-white
        border-r
        border-slate-200
        flex
        flex-col
      "
    >
      {/* Profile */}
      <div className="flex items-center justify-between px-6 py-6">
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

        <button className="text-slate-400">
          <ChevronLeft size={18} />
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
          }) => (
            <button
              key={label}
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

              {active && (
                <Home size={16} />
              )}
            </button>
          )
        )}
      </div>

      {/* History */}
      <div className="px-6 mt-8">
        <p className="text-sm text-slate-400">
          Today
        </p>

        <div className="mt-4 space-y-4 text-sm">
          <p className="cursor-pointer hover:text-blue-600">
            Research Assistance Request
          </p>

          <p className="cursor-pointer hover:text-blue-600">
            Summarizing Last Meeting
          </p>

          <p className="cursor-pointer hover:text-blue-600">
            Prioritizing Tasks Request
          </p>
        </div>

        <p className="text-sm text-slate-400 mt-8">
          Yesterday
        </p>

        <div className="mt-4 text-sm">
          <p className="cursor-pointer hover:text-blue-600">
            Document Summary Request
          </p>
        </div>
      </div>
      {/* Settings */}
      <div className="px-6 py-6">
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