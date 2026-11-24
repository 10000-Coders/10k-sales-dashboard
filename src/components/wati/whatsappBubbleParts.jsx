"use client";

import { useState } from "react";
import { Copy, ExternalLink, List, Phone, Reply } from "lucide-react";

// WhatsApp mobile only collapses long messages behind "Read more" past roughly this length.
export const COLLAPSE_CHAR_LIMIT = 700;

/** WhatsApp-style inline formatting: *bold*, _italic_, ~strike~, ```mono``` and links. */
const WA_TOKEN_RE = /(```[\s\S]+?```|\*[^*\n]+\*|_[^_\n]+_|~[^~\n]+~|https?:\/\/[^\s]+)/g;

export function renderWhatsAppText(text) {
  const parts = text.split(WA_TOKEN_RE);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("```") && part.endsWith("```") && part.length > 6) {
      return (
        <code key={i} className="font-mono text-[13px]">
          {part.slice(3, -3)}
        </code>
      );
    }
    if (part.length > 2 && part.startsWith("*") && part.endsWith("*")) {
      return <strong key={i} className="font-semibold">{part.slice(1, -1)}</strong>;
    }
    if (part.length > 2 && part.startsWith("_") && part.endsWith("_")) {
      return <em key={i}>{part.slice(1, -1)}</em>;
    }
    if (part.length > 2 && part.startsWith("~") && part.endsWith("~")) {
      return <s key={i}>{part.slice(1, -1)}</s>;
    }
    if (/^https?:\/\//.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="break-all text-[#027eb5] hover:underline"
        >
          {part}
        </a>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

/** Buttons may be plain labels or `{ type, text }` from the templates API. */
function normalizeButton(btn) {
  if (btn && typeof btn === "object") {
    return { text: String(btn.text || "").trim(), type: String(btn.type || "").toUpperCase() };
  }
  return { text: String(btn || "").trim(), type: "" };
}

export function buttonIcon(label, type = "") {
  const t = String(type || "").toUpperCase();
  if (t.includes("PHONE") || t.includes("CALL")) return Phone;
  if (t.includes("URL")) return ExternalLink;
  if (t.includes("COPY") || t.includes("OTP")) return Copy;
  if (t.includes("QUICK")) return Reply;
  const l = String(label || "").toLowerCase();
  if (/\b(call|phone|dial)\b/.test(l)) return Phone;
  if (/\b(visit|website|link|open|view|register|apply|join|download|know more|learn more)\b/.test(l)) {
    return ExternalLink;
  }
  if (/\bcopy\b/.test(l)) return Copy;
  return Reply;
}

export function TemplateButtons({ buttons }) {
  const [showAll, setShowAll] = useState(false);
  const items = (buttons || []).map(normalizeButton).filter((b) => b.text);
  // WhatsApp shows at most 3 buttons inline; with more, it shows 2 + "See all options".
  const collapsed = items.length > 3 && !showAll;
  const visible = collapsed ? items.slice(0, 2) : items;
  if (!items.length) return null;

  return (
    <div>
      {visible.map(({ text: label, type }, idx) => {
        const Icon = buttonIcon(label, type);
        return (
          <div
            key={`${label}-${idx}`}
            className="flex min-h-[40px] items-center justify-center gap-1.5 border-t border-black/[0.08] px-3 py-2 text-center text-[14px] font-medium text-[#027eb5]"
          >
            <Icon className="h-4 w-4 shrink-0" />
            <span className="truncate">{label}</span>
          </div>
        );
      })}
      {collapsed ? (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          className="flex min-h-[40px] w-full items-center justify-center gap-1.5 border-t border-black/[0.08] px-3 py-2 text-[14px] font-medium text-[#027eb5] hover:bg-black/[0.03]"
        >
          <List className="h-4 w-4" />
          See all options
        </button>
      ) : null}
    </div>
  );
}

export function WhatsAppBody({ text }) {
  const [expanded, setExpanded] = useState(false);
  const needsCollapse = text.length > COLLAPSE_CHAR_LIMIT;
  const visible =
    !needsCollapse || expanded ? text : `${text.slice(0, COLLAPSE_CHAR_LIMIT).trimEnd()}…`;

  return (
    <>
      <span className="whitespace-pre-wrap break-words">{renderWhatsAppText(visible)}</span>
      {needsCollapse && !expanded ? (
        <>
          {" "}
          <button
            type="button"
            className="font-medium text-[#027eb5] hover:underline"
            onClick={() => setExpanded(true)}
          >
            Read more
          </button>
        </>
      ) : null}
    </>
  );
}
