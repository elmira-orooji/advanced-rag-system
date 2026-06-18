import { motion } from "framer-motion";
import {
  UploadCloud,
  FileText,
  MessageSquare,
} from "lucide-react";

import ChatWindow from "../components/ChatWindow";
import ChatInput from "../components/ChatInput";

export default function UploadFilesPage() {
  const files = [
    {
      name: "Product_Specs.pdf",
      status: "Indexed",
      added: "Today",
      size: "2.4 MB",
    },
    {
      name: "Knowledge_Q1.md",
      status: "Processing",
      added: "Yesterday",
      size: "14 KB",
    },
  ];

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
          className="flex-1 overflow-hidden"
        >
      <div className="grid grid-cols-12 h-full">

        {/* Left Side */}
            <div
className="
  col-span-5
  flex
  flex-col
  gap-8
  px-8
  py-8
  bg-[#F8FAFC]
  dark:bg-[#151B2D]
"
>
          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-100">
              Upload Knowledge
            </h1>

            <p className="text-slate-500 dark:text-slate-400 mt-2">
              Upload documents to build your knowledge base.
            </p>
          </div>

          {/* Upload Zone */}
          <div
            className="
              bg-white
              dark:bg-[#1D263B]
              rounded-2xl
              border-2
              border-dashed
              border-slate-300

              h-[240px]
              shrink-0
              flex
              flex-col
              items-center
              justify-center

              cursor-pointer

              transition-all
              duration-300

              hover:border-blue-400
              hover:bg-blue-50
            "
          >
            <UploadCloud
              size={42}
              className="text-slate-400"
            />

            <h3
              className="
                mt-6
                text-lg
                font-semibold
              "
            >
              Click to upload or drag and drop
            </h3>

            <p className="text-slate-400 mt-2">
              PDF, TXT, DOCX (max. 10MB)
            </p>
          </div>

{/* Knowledge Base */}
<div
  className="
    flex
    flex-col

    h-[320px]

    pt-2

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
    "
  >
    <div>
      <h2 className="text-2xl font-semibold">
        Knowledge Base
      </h2>

      <p className="text-slate-400">
        {files.length} documents
      </p>
    </div>
  </div>

 {/* Table Header */}
<div
  className="
    grid
    grid-cols-[4fr_2fr_2fr_1fr]
    items-center
    px-6
    pb-5
    text-xs
    font-semibold
    uppercase
    tracking-wider
    text-slate-400
  "
>
  <div className="pl-[10px]">
    File Name
  </div>

  <div className=" flex justify-center">
    Status
  </div>

  <div className="flex justify-center">
    Added
  </div>

  <div className="flex justify-end whitespace-nowrap">
  Size
</div>
</div>

  {/* Files */}
<div
  className="
    flex-1
    min-h-0

    overflow-y-auto

    space-y-2

    pr-1
  "
>
    {files.map((file) => (
      <div
        key={file.name}
        className="
  grid
  grid-cols-[4fr_2fr_2fr_1fr]
  items-center

  px-6
  py-1

rounded-2xl
bg-white
dark:bg-[#1D263B]
border
border-slate-100
dark:border-[#2A3550]
  hover:shadow-md
  hover:-translate-y-1

  transition-all
  duration-300
"
      >
        {/* File */}
        <div className="flex items-center gap-4 min-w-0">
<div
  className="
    w-10
    h-10
    rounded-xl
    bg-slate-50
    flex
    items-center
    justify-center
    shrink-0
  "
>
            <FileText
              size={18}
              className="text-blue-600"
            />
          </div>

          <span
            title={file.name}
            className="
              flex-1
              min-w-0
              font-medium
              text-slate-800
              truncate
            "
          >
            {file.name}
          </span>
        </div>

        {/* Status */}
        <div className="flex justify-center">
          <span
            className={`
              px-2
              py-2
              rounded-full
              text-sm
              font-medium
              ${
                file.status === "Indexed"
                  ? "bg-green-100 text-green-600"
                  : "bg-yellow-100 text-yellow-600"
              }
            `}
          >
            {file.status}
          </span>
        </div>

{/* Added */}
<div className="flex justify-center text-slate-500 dark:text-slate-400">
  {file.added}
</div>

{/* Size */}
<div
  className="
    flex
    justify-end

    text-slate-500
    dark:text-slate-400

    whitespace-nowrap
  "
>
  {file.size}
</div>
      </div>
    ))}
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

               border-b border-slate-200 dark:border-[#2A3550]

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
                    <div className="flex-1 overflow-y-auto px-8 py-6">
                    <ChatWindow
                        messages={[]}
                        isThinking={false}
                    />
                    </div>

                    {/* Existing Input */}
                <div className="px-8 py-6 border-t border-slate-200 dark:border-[#2A3550]">
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