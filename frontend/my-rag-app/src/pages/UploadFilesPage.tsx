// src/pages/UploadFilesPage.tsx

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
    <div className="flex-1 p-8 overflow-hidden">
      <div className="grid grid-cols-5 gap-6 h-full">

        {/* Left Side */}
        <div className="col-span-2 flex flex-col gap-6">

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
              flex-1

              bg-white
              rounded-3xl

              border
              border-slate-200

              p-6

              overflow-hidden

              flex
              flex-col
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
                <h2
                  className="
                    text-2xl
                    font-semibold
                  "
                >
                  Knowledge Base
                </h2>

                <p className="text-slate-400">
                  {files.length} documents
                </p>
              </div>

              <button
                className="
                  rounded-xl

                  bg-blue-600
                  text-white

                  px-4
                  py-2

                  text-sm

                  hover:bg-blue-700

                  transition
                "
              >
                Add New
              </button>
            </div>

            {/* Table Header */}
            <div
            className="
                flex
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
            <div className="flex-1">
            File Name
            </div>

            <div className="w-[110px] text-center">
            Status
            </div>

            <div className="w-[90px] text-center">
            Added
            </div>

            <div className="w-[70px] text-right">
            Size
            </div>
            </div>

            {/* Files */}
            <div
              className="
                flex-1
                overflow-y-auto

                mt-4

                space-y-3
              "
            >
              {files.map((file) => (
  <div
    key={file.name}
    className="
      flex
      items-center

      px-6
      py-5

      rounded-3xl

      border
      border-slate-100

      bg-white

      mb-4

      hover:shadow-md
      hover:-translate-y-1

      transition-all
      duration-300
    "
  >
    {/* File */}
    <div className="flex-1 flex items-center gap-4 min-w-0">
      <div
        className="
          w-12
          h-12

          rounded-2xl

          bg-slate-50

          flex
          items-center
          justify-center

          shrink-0
        "
      >
        <FileText
          size={22}
          className="
            text-blue-600
          "
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
    <div className="w-[110px] flex justify-center">
      <span
        className={`
          px-4
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
    <div
      className="
        w-[90px]

        text-center

        text-slate-500
      "
    >
      {file.added}
    </div>

    {/* Size */}
    <div
      className="
        w-[70px]

        text-right

        text-slate-500
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
        <div className="col-span-3 h-full">
          <div
            className="
              bg-white

              rounded-3xl

              border
              border-slate-200

              h-full

              flex
              flex-col

              overflow-hidden
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
                    <ChatInput
                    disabled={false}
                    onSend={() => {}}
            />
          </div>
        </div>
      </div>
    </div>
  );
}