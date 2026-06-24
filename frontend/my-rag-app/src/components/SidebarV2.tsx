import {
  Home,
  CheckSquare,
  Settings,
  LogOut,
  Upload,
  ChevronsLeft,
  UserPlus,
} from "lucide-react";
import type { ChatSession } from "../types/chat";
import { useState } from "react";
import { useTranslation } from "react-i18next";
interface SidebarV2Props {
  sessions: ChatSession[];

  activeSessionId: string | null;

  onSelectChat: (id: string) => void;

  activePage: string;

setActivePage: (
  page:
    | "home"
    | "tasks"
    | "upload"
    | "users"
    | "settings"
) => void;

}


export default function SidebarV2({
  sessions,
  activeSessionId,
  onSelectChat,
  setActivePage,
  activePage,
}: SidebarV2Props) {
  const [collapsed, setCollapsed] = useState(false);
  const { t } = useTranslation();
  return (
    <aside
      className={`
        ${
          collapsed
            ? "w-[100px]"
            : "w-[280px]"
        }

        h-screen
        bg-white
        dark:bg-[#1D263B]
        border-r border-slate-200
        dark:border-[#2A3550]

        flex flex-col

        transition-all
        duration-500
        ease-[cubic-bezier(0.22,1,0.36,1)]
      `}
    >
      {/* Profile */}
              <div
                className={`
                  relative
                  flex
                  items-center

                  ${
                    collapsed
                      ? "justify-center px-4"
                      : "justify-between px-6"
                  }

                  py-6
                `}
              >
            <div
                className={`
                  flex
                  items-center

                  ${
                    collapsed
                      ? "justify-center"
                      : "gap-3"
                  }
                `}
              >
          <img
            src="https://i.pravatar.cc/40"
            alt="User"
            className="
              w-12
              h-12
              rounded-full
              object-cover
              shrink-0
            "
          />
          <span
            className={`
              whitespace-nowrap
              overflow-hidden
              dark:text-slate-300
              transition-all
              duration-300

              ${
                collapsed
                  ? "w-0 opacity-0"
                  : "w-auto opacity-100"
              }
            `}
          >
            Sam Smith
          </span>
        </div>

<button
  onClick={() => setCollapsed(!collapsed)}
  className={`
    absolute
    top-1/2
    -translate-y-1/2

    ${
      collapsed
        ? "left-[78px]"
        : "right-6"
    }

    transition-all
    duration-300
  `}
>
          <ChevronsLeft
            size={18}
            className={`
              text-slate-300

              transition-transform
              duration-500

              ${
                collapsed
                  ? "rotate-180"
                  : ""
              }
            `}
          />
        </button>
      </div>

      {/* Menu */}
      <div className="px-4 space-y-2">
        {[
          {
          icon: Home,
          label: t("home"),
          active: activePage === "home",
          onClick: () =>
          setActivePage("home"),
          },
          {
            icon: CheckSquare,
            label: t("tasks"),
            active: activePage === "tasks",
            onClick: () =>
            setActivePage("tasks"),
          },
          {
            icon: Upload,
            label: t("upload"),
            active: activePage === "upload",
            onClick: () => setActivePage("upload"),
          },
          {
            icon: UserPlus,
            label: t("users"),
            active: activePage === "users",
            onClick: () => setActivePage("users"),
          },
          {
            icon: Settings,
            label: t("settings"),
            active: activePage === "settings",
            onClick: () => setActivePage("settings"),
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
              title={label}
              onClick={onClick}
              className={`
                w-full

                flex
                items-center

                ${
                  collapsed
                    ? "justify-center px-0"
                    : "justify-start px-4"
                }

                py-3

                rounded-2xl
                transition-all

                ${
                  active
                    ? "dark:bg-blue-500/15 text-slate-900 dark:text-slate-100"
                    : "hover:bg-slate-50 text-slate-500 dark:text-slate-400"
                }
              `}
            >
              <div
  className={`
    flex
    items-center
    overflow-hidden
    w-full

    ${
      collapsed
        ? "justify-center"
        : "gap-3"
    }
  `}
>
                <Icon
                  size={collapsed ? 24 : 18}
                  className={`
                    shrink-0
                    transition-all
                    duration-300
                  `}
                />
                <span
                  className={`
                    whitespace-nowrap
                    overflow-hidden

                    transition-all
                    duration-300

                    ${
                      collapsed
                        ? "w-0 opacity-0"
                        : "w-auto opacity-100"
                    }
                  `}
                >
                  {label}
                </span>
              </div>
            </button>
          )
        )}
      </div>

      {/* Recent Chats */}
      {!collapsed && (
        <div
  className="
    mt-8
    flex-1
    overflow-y-auto

    scrollbar
    scrollbar-thin

    scrollbar-thumb-[#3B4A69]
    scrollbar-track-transparent

    hover:scrollbar-thumb-[#5A6D94]
  "
>
          <p className="px-6 text-sm text-slate-400 mb-4">
             {t("today")}
          </p>

          <div className="space-y-4 px-6 dark:text-slate-300">
            <p>Research Assistance Request</p>
            <p>Summarizing Last Meeting</p>
            <p>Prioritizing Tasks Request</p>
          </div>

          <p className="px-6 text-sm text-slate-400 mt-8 mb-4">
            {t("yesterday")}
          </p>

          <div className="px-6 dark:text-slate-300">
            <p>Document Summary Request</p>
          </div>
        </div>
      )}

      {/* Logout */}
      <div className="mt-auto px-6 py-6 border-t border-slate-200 dark:border-[#2A3550]">
        <button
          title="Logout"
          className={`
            w-full
            flex
            items-center

            ${
              collapsed
                ? "justify-center px-0"
                : "justify-start px-4"
            }

            gap-3

            text-slate-500
            dark:text-slate-400
            hover:text-red-500

            transition-colors
          `}
        >
          <LogOut
              size={collapsed ? 24 : 18}
              className="transition-all duration-300"
            />

          <span
            className={`
              whitespace-nowrap
              overflow-hidden

              transition-all
              duration-300

              ${
                collapsed
                  ? "w-0 opacity-0"
                  : "w-auto opacity-100"
              }
            `}
          >
            {t("logout")}
          </span>
        </button>
      </div>
    </aside>
  );
}