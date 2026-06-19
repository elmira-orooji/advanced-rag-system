import {
  UserPlus,
  Pencil,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { motion } from "framer-motion";
import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";

export default function UsersPage() {
    const users = [
  {
    id: 1,
    firstName: "Ali",
    lastName: "Ahmadi",
    jobTitle: "Product Manager",
  },
  {
    id: 2,
    firstName: "Sara",
    lastName: "Mohammadi",
    jobTitle: "AI Engineer",
  },
];
return(
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.25 }}
  className="grid grid-cols-12 h-full "
>
<div className="col-span-5 border-r border-slate-900  dark:bg-[#151B2D]">
    <div className="px-8 py-6 border-b border-slate-700 bg-[#F6F8FC] dark:bg-[#151B2D]">

  <div className="flex items-center justify-between bg-[#F6F8FC] dark:bg-[#151B2D]">

    <div className="flex items-center gap-3 ">
      <UserPlus
        size={22}
        className="text-blue-500"
      />
<h1
  className="
    text-3xl
    font-bold
    dark:text-slate-100
  "
>
  Users
</h1>
    </div>

<button
  className="
    flex
    items-center
    gap-2

    px-4
    py-2

    rounded-xl

    bg-cyan-400
    text-slate-900

    font-semibold
  "
>
  <UserPlus size={18} />
  Add User
</button>

  </div>

</div>

<div
  className="
    grid
    grid-cols-4

    px-8
    py-4

    text-sm
    font-semibold

    text-slate-400
  "
>
  <span>FIRST NAME</span>
  <span>LAST NAME</span>
  <span>JOB TITLE</span>
  <span>ACTIONS</span>
</div>
<div className="space-y-4 px-6">

  {users.map((user) => (
    <div
      key={user.id}
      className="
        h-16

        rounded-3xl

        bg-white
        dark:bg-[#1E2A44]

        border
        border-slate-200
        dark:border-slate-700

        px-6

        grid
        grid-cols-4

        items-center
      "
    >
      <span>{user.firstName}</span>

      <span>{user.lastName}</span>

      <span>{user.jobTitle}</span>

      <div className="flex gap-2">
        <button>
          <Pencil size={18} />
        </button>

        <button>
          <Trash2
            size={18}
            className="text-red-400"
          />
        </button>
      </div>
    </div>
  ))}
</div>

</div>

         {/* Right Side - Chat */}
        <div className="col-span-7 h-screen">
          <div
className="
  bg-white
  dark:bg-[#1D263B]
  border-1
  border-slate-200
 dark:border-[#334155]

  h-full

  flex
  flex-col
"
          >
            {/* Header */}
            <div
              className="
                px-6
                py-5

                border-b
                border-slate-200
                dark:border-[#334155]

                flex
                items-center
                gap-4
              "
            >
              <div
                className="
                  w-12
                  h-12

                  rounded-2xl

                  bg-blue-100
                  dark:bg-[#24304A]
                  dark:border-[#334155]
                  dark:text-cyan-300
                  flex
                  items-center
                  justify-center
                "
              >
                <MessageSquare
                  size={22}
                  className="text-blue-600 "
                />
              </div>

              <div>
                <h2
                  className="
                    font-semibold
                    text-lg
                    dark:text-slate-300
                  "
                >
                  AI Assistant
                </h2>

                <p
                  className="
                    text-green-400
                    text-sm
                  "
                >
                  ● RAG Active
                </p>
              </div>
            </div>

                    {/* Existing Chat */}
                    <div className="flex-1 overflow-y-auto px-8 py-6 ">
                    <ChatWindow
                        messages={[]}
                        isThinking={false}
                    />
                    </div>

                    {/* Existing Input */}
                <div className="px-8 py-6 border-t border-slate-200 dark:border-[#334155]">
                <ChatInput
                    disabled={false}
                    onSend={() => {}}
                />
                </div>
          </div>
        </div>
        
       </motion.div>
  );
}