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
          className="flex-1 p-8 overflow-hidden"
        >
      <div className="grid grid-cols-12 gap-6 h-full">

        {/* Left Side */}
            <div
            className="
                col-span-5

                flex
                flex-col

                gap-6

                h-[calc(100vh-100px)]
            "
            >

          {/* Header */}
          <div>
            <h1 className="text-4xl font-bold text-slate-900">
              Upload Knowledge
            </h1>

            <p className="text-slate-500 mt-2">
              Upload documents to build your knowledge base.
            </p>
          </div>

          {/* Upload Zone */}
          <div
            className="
              bg-white
              rounded-3xl
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
    bg-white
    rounded-3xl
    border border-slate-200
    p-6

    flex
    flex-col

    h-[260px]
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

    space-y-4

    pr-2
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
  py-5

  rounded-3xl
  border
  border-slate-100

  bg-white

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
<div className="flex justify-center text-slate-500">
  {file.added}
</div>

{/* Size */}
<div
  className="
    flex
    justify-end

    text-slate-500

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
        <div className="col-span-7 h-[620px]">
          <div
            className="
              bg-white

              rounded-3xl

              border
              border-slate-200

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
                    <div className="flex-1 overflow-hidden">
                    <ChatWindow
                        messages={[]}
                        isThinking={false}
                    />
                    </div>

                    {/* Existing Input */}
                <div className="px-6 pb-6 pt-2">
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