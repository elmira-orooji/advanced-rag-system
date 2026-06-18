
import { useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ListTodo,
  Search,
  MessageSquare,
} from "lucide-react";

import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";

import type {
  ChatMessage,
} from "../types/chat";

const initialMessages: ChatMessage[] = [
  {
    id: "1",
    role: "assistant",
    content:
      "Hello! I can help you organize and prioritize your tasks. Select a task or ask me anything.",
    createdAt: new Date().toISOString(),
  },
];

export default function TasksPage() {
  const [messages, setMessages] =
    useState<ChatMessage[]>(
      initialMessages
    );


  const [isThinking, setIsThinking] =
    useState(false);

  const handleSend = (
    message: string
  ) => {
    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: message,
      createdAt:
        new Date().toISOString(),
    };

    setMessages((prev) => [
      ...prev,
      userMessage,
    ]);

    setIsThinking(true);

    setTimeout(() => {
      const assistantMessage: ChatMessage =
        {
          id: crypto.randomUUID(),

          role: "assistant",

          content: `I understand. Regarding "${message}", here's my recommendation:\n\n• Break the task into smaller steps.\n• Prioritize based on urgency and impact.\n• Set realistic deadlines.\n• Track progress regularly.`,

          createdAt:
            new Date().toISOString(),
        };

      setMessages((prev) => [
        ...prev,
        assistantMessage,
      ]);

      setIsThinking(false);
    }, 1200);
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 20,
        filter: "blur(8px)",
      }}
      animate={{
        opacity: 1,
        y: 0,
        filter: "blur(0px)",
      }}
      transition={{
        duration: 0.5,
      }}
      className="h-full px-8 pb-8 overflow-hidden bg-[#F8FAFC]"
    >
       <div className="grid grid-cols-12 gap-6 h-screen">

        {/* Left Side */}
<div
className="
  col-span-5
  flex
  flex-col
  h-full
  pt-8
"
>
          <div
            className="
  flex
  flex-col

  flex-1

  min-h-0
"
          >
            {/* Header */}
            <div
              className="
                flex
                items-center
                justify-between
                mb-6
                shrink-0
                border-b border-slate-200 dark:border-[#2A3550]
                pb-6
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-5
                "
              >
                <h2
                  className="
                    text-2xl
                    font-semibold
                    flex
                    items-center
                    gap-2
                  "
                >
                  <ListTodo
                    size={20}
                    className="text-slate-400"
                  />

                  <span>
                    My Tasks
                  </span>

                  <span
                    className="
                      text-slate-400
                      font-normal
                      text-xl
                    "
                  >
                    4
                  </span>
                </h2>

                <div className="relative w-[190px]">
                  <Search
                    size={16}
                    className="
                      absolute
                      left-4
                      top-1/2
                      -translate-y-1/2
                      text-slate-400
                    "
                  />

                  <input
                    placeholder="Search ..."
                    className="
                      w-full
                      h-10
                      rounded-full
                      border
                      border-slate-200
                      dark:border-[#2A3550]
                      bg-white
                      dark:bg-[#1D263B]
                      pl-10
                      pr-10
                      text-sm
                      outline-none
                    "
                  />

                  <button
                    className="
                      absolute
                      right-2
                      top-1/2
                      -translate-y-1/2

                      w-8
                      h-8

                      rounded-full
                      bg-slate-100

                      flex
                      items-center
                      justify-center

                      hover:bg-slate-200
                      transition
                    "
                  >
                    <ArrowRight
                      size={16}
                      className="text-slate-500 dark:text-slate-400"
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Tasks */}
<div
  className="
    flex-1
    min-h-0
    overflow-y-auto
    space-y-1
    pr-2
  "
>
              {[
                {
                  title:
                    "Design Meeting",
                  badge1: "2 pm",
                  badge2:
                    "Join now",
                  color:
                    "bg-orange-500",
                },

                {
                  title:
                    "Refine UI components based on user feedback",

                  badge1:
                    "Urgent",

                  badge2:
                    "By today",

                  color:
                    "bg-red-500",
                },

                {
                  title:
                    "Prepare a prototype for usability testing",

                  badge1:
                    "In progress",

                  badge2:
                    "By tomorrow",

                  color:
                    "bg-blue-500",
                },

                {
                  title:
                    "Collaborate with developers on implementation detail",

                  badge1:
                    "To do",

                  badge2:
                    "By tomorrow",

                  color:
                    "bg-cyan-500",
                },
              ].map(
                (
                  task,
                  index
                ) => (
                  <div
                    key={index}
                    className="
rounded-2xl
border
border-slate-100

bg-white
dark:bg-[#1D263B]
dark:border-[#2A3550]
px-5
py-4

                      hover:shadow-md
                      hover:-translate-y-1

                      transition-all
                      duration-300

                      cursor-pointer
                    "
                  >
                    <div
                      className="
                        flex
                        items-center
                        gap-3
                      "
                    >
                      <div
                        className={`
                          w-2
                          h-2
                          rounded-full
                          ${task.color}
                        `}
                      />

                      <span className="flex-1">
                        {task.title}
                      </span>

                      <span
                        className="
                          rounded-full
                          bg-slate-100
                          px-3
                          py-1
                          text-sm
                        "
                      >
                        {task.badge1}
                      </span>

                      <span
                        className="
                          rounded-full
                          bg-blue-100
                          dark:bg-blue-500/15
                          text-blue-600
                          px-3
                          py-1
                          text-sm
                        "
                      >
                        {task.badge2}
                      </span>
                    </div>
                  </div>
                )
              )}
            </div>
          </div>
        </div>


        {/* Right Side - Chat */}
        <div className="col-span-7 h-screen">
          <div
className="
  bg-white
  dark:bg-[#1D263B]
  border-l
  border-slate-200
  dark:border-[#2A3550]

  h-full

  flex
  flex-col
"
          >
            {/* Header */}
            <div
              className="
                px-8
                py-5

                border-b
                border-slate-200
                dark:border-[#2A3550]
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
                  dark:bg-blue-500/15
                  flex
                  items-center
                  justify-center
                "
              >
                <MessageSquare
                  size={22}
                  className="text-blue-600"
                />
              </div>

              <div>
                <h2
                  className="
                    font-semibold
                    text-lg
                  "
                >
                  AI Assistant
                </h2>

                <p
                  className="
                    text-green-500
                    text-sm
                  "
                >
                  ● RAG Active
                </p>
              </div>
            </div>

                    {/* Existing Chat */}
                    <div className="     flex-1
    min-h-0
    overflow-hidden

    border-b
    border-slate-200
    dark:border-[#2A3550]">
                    <ChatWindow
                        messages={[]}
                        isThinking={false}
                    />
                    </div>

                    {/* Existing Input */}
                <div className="px-8 py-8 pt-4 shrink-0">
                <ChatInput
                    disabled={false}
                    onSend={() => {}}
                />
                </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}