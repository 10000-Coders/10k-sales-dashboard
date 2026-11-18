import { cn } from "@/lib/utils";
import { watiStatusTone } from "@/lib/watiFormatters";

const TONE_CLASS = {
  ok: "bg-emerald-100 text-emerald-700",
  run: "bg-blue-100 text-blue-700",
  fail: "bg-red-100 text-red-700",
  warn: "bg-amber-100 text-amber-800",
  neutral: "bg-muted text-muted-foreground",
};

export default function WatiStatusBadge({ status, className }) {
  const label = status ? String(status) : "—";
  const tone = watiStatusTone(status);
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium capitalize",
        TONE_CLASS[tone] || TONE_CLASS.neutral,
        className
      )}
    >
      {label}
    </span>
  );
}
