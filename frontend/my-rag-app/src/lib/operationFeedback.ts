export type OperationKind = "load" | "members" | "upload" | "processing" | "sync" | "answer";

export function operationError(error: unknown, operation: OperationKind, isFa: boolean): string {
  const raw = error instanceof Error ? error.message.trim() : "";
  const normalized = raw.toLowerCase();
  const genericNetworkError = !raw || normalized.includes("failed to fetch") || normalized.includes("network error") || normalized === "request failed";
  const copy = isFa
    ? {
        load: "دریافت اطلاعات انجام نشد. اتصال را بررسی کنید و دوباره تلاش کنید.",
        members: "دریافت اعضای تیم انجام نشد. اتصال سرویس را بررسی کنید یا دوباره تلاش کنید.",
        upload: "بارگذاری فایل انجام نشد. اتصال و نوع فایل را بررسی کنید و دوباره تلاش کنید.",
        processing: "پردازش سند انجام نشد. دوباره تلاش کنید؛ اگر ادامه داشت، فایل را بررسی کنید.",
        sync: "همگام‌سازی انجام نشد. اتصال منبع را بررسی کنید و دوباره تلاش کنید.",
        answer: "پاسخ دریافت نشد. چند لحظه دیگر دوباره تلاش کنید.",
      }
    : {
        load: "We couldn't load this information. Check your connection and try again.",
        members: "We couldn't load team members. Check the service connection and try again.",
        upload: "The file couldn't be uploaded. Check the connection and file type, then try again.",
        processing: "The document couldn't be processed. Try again; if it persists, check the file.",
        sync: "The connector couldn't sync. Check the source connection and try again.",
        answer: "We couldn't generate an answer. Please try again in a moment.",
      };
  return genericNetworkError ? copy[operation] : raw;
}

export function processingStageLabel(stage: string, isFa: boolean): string {
  const labels: Record<string, [string, string]> = {
    queued: ["در صف پردازش", "Queued for processing"],
    extracting: ["در حال خواندن محتوا", "Reading content"],
    chunking: ["در حال آماده‌سازی بخش‌ها", "Preparing passages"],
    embedding: ["در حال ایندکس‌کردن", "Indexing for search"],
    indexing: ["در حال ایندکس‌کردن", "Indexing for search"],
    processing: ["در حال پردازش سند", "Processing document"],
  };
  return labels[stage.toLowerCase()]?.[isFa ? 0 : 1] ?? (isFa ? "در حال پردازش سند" : "Processing document");
}
