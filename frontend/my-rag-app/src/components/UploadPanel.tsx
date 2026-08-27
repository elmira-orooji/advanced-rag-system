import { confirmAction } from "../services/confirmation";
import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import toast from "react-hot-toast";
import {
  Upload,
  FileText,
  X,
} from "lucide-react";

export default function UploadPanel() {
  const [files, setFiles] =
    useState<File[]>([]);

const onDrop = useCallback(
  (acceptedFiles: File[]) => {
    setFiles((prev) => [
      ...prev,
      ...acceptedFiles,
    ]);

    acceptedFiles.forEach((file) =>
      toast.success(
        `${file.name} uploaded`
      )
    );
  },
  []
);
  const {
    getRootProps,
    getInputProps,
    isDragActive,
  } = useDropzone({
    onDrop,

    accept: {
      "application/pdf": [".pdf"],

      "text/plain": [".txt"],

      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
    },
  });

const removeFile = async (
  fileName: string
) => {
  if (!await confirmAction(`Remove “${fileName}”?`)) return;
  setFiles((prev) =>
    prev.filter(
      (file) =>
        file.name !== fileName
    )
  );

  toast.success(
    "Document removed"
  );
};

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
      <h2 className="mb-5 text-xl font-semibold">
        Upload Documents
      </h2>

      <div
        {...getRootProps()}
        className={`
          cursor-pointer
          rounded-2xl
          border-2
          border-dashed
          p-10
          text-center
          transition-all

          ${
            isDragActive
              ? "border-blue-500 bg-blue-500/10"
              : "border-slate-700 hover:border-slate-500"
          }
        `}
      >
        <input {...getInputProps()} />

        <Upload
          size={42}
          className="mx-auto mb-4 text-blue-500"
        />

        <p className="text-slate-300">
          {isDragActive
            ? "Drop files here..."
            : "Drag & drop documents here"}
        </p>

        <p className="mt-2 text-sm text-slate-500">
          PDF • DOCX • TXT
        </p>
      </div>

      {files.length > 0 && (
        <div className="mt-6 space-y-3">
          {files.map((file) => (
            <div
              key={`${file.name}-${file.lastModified}`}
              className="
                flex
                items-center
                justify-between
                rounded-2xl
                bg-slate-800
                px-4
                py-3
              "
            >
              <div className="flex items-center gap-3">
                <FileText
                  size={18}
                  className="text-blue-400"
                />

                <div>
                  <p className="text-sm font-medium">
                    {file.name}
                  </p>

                  <p className="text-xs text-slate-400">
                    {(
                      file.size /
                      1024
                    ).toFixed(1)}{" "}
                    KB
                  </p>
                </div>
              </div>

              <button
                onClick={() =>
                  removeFile(
                    file.name

                  )
                }
                className="
                  rounded-lg
                  p-2
                  text-slate-400
                  transition
                  hover:bg-slate-700
                  hover:text-red-400
                "
              >
                <X size={18} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
