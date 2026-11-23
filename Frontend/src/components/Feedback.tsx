import { AlertCircle, CheckCircle2, Info, X } from "lucide-react";

type FeedbackTone = "error" | "info" | "success";

function safeFeedbackMessage(message: string) {
  let clean = message.trim();
  if (!clean) return "Something went wrong. Please try again.";

  if (/^\s*[<{]/.test(clean)) {
    try {
      const parsed: unknown = JSON.parse(clean);
      if (typeof parsed === "object" && parsed !== null) {
        const details = parsed as { error?: unknown; message?: unknown };
        if (typeof details.error === "string") clean = details.error;
        else if (typeof details.message === "string") clean = details.message;
        else return "The server could not complete the request. Please try again.";
      } else if (clean.startsWith("<")) {
        return "The server could not complete the request. Please try again.";
      }
    } catch {
      if (clean.startsWith("<")) return "The server could not complete the request. Please try again.";
    }
  }

  if (/<(?:!doctype|html|body|head|script|style|pre)\b/i.test(clean)) {
    return "The server could not complete the request. Please try again.";
  }

  const stackStart = clean.search(/\n\s*(?:at\s|Caused by:|[\w.$]*(?:Exception|Error):)/i);
  if (stackStart >= 0) clean = clean.slice(0, stackStart);
  clean = clean.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  clean = clean.replace(/^(?:[\w.$]+(?:Exception|Error)):\s*/i, "");
  if (
    !clean ||
    /\b(?:stack trace|exception in thread)\b/i.test(clean) ||
    /^(?:TypeError|SyntaxError|ReferenceError):/i.test(clean) ||
    /^(?:Failed to fetch|NetworkError|Load failed)$/i.test(clean)
  ) {
    return "The server could not complete the request. Please try again.";
  }
  return clean.length > 240 ? `${clean.slice(0, 237).trimEnd()}…` : clean;
}

export function FeedbackMessage({
  message,
  tone = "error",
  onDismiss,
  action,
  className = "",
}: {
  message: string;
  tone?: FeedbackTone;
  onDismiss?: () => void;
  action?: { label: string; onClick: () => void };
  className?: string;
}) {
  const Icon = tone === "error" ? AlertCircle : tone === "success" ? CheckCircle2 : Info;
  const styles = tone === "error"
    ? "border-red-200 bg-red-50 text-red-800"
    : tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-800"
      : "border-[#e5d9e8] bg-white text-[#54205d]";

  return (
    <div role={tone === "error" ? "alert" : "status"} aria-live={tone === "error" ? "assertive" : "polite"} className={`flex items-start gap-3 rounded-xl border px-4 py-3 text-sm ${styles} ${className}`}>
      <Icon size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
      <div className="min-w-0 flex-1"><p>{safeFeedbackMessage(message)}</p>{action && <button type="button" onClick={action.onClick} className="mt-2 rounded font-semibold underline underline-offset-2 outline-none focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2">{action.label}</button>}</div>
      {onDismiss && <button type="button" onClick={onDismiss} aria-label="Dismiss message" className="grid size-7 shrink-0 place-items-center rounded-md outline-none transition hover:bg-black/5 focus-visible:ring-2 focus-visible:ring-brand-600 focus-visible:ring-offset-2"><X size={16} aria-hidden="true" /></button>}
    </div>
  );
}

export function SuccessToast({ message, onDismiss }: { message: string; onDismiss: () => void }) {
  if (!message) return null;
  return <div className="fixed bottom-4 right-4 z-[70] w-[calc(100%-2rem)] max-w-md"><FeedbackMessage message={message} tone="success" onDismiss={onDismiss} className="bg-white shadow-lg" /></div>;
}

