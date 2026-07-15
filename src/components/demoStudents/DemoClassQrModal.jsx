"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import QRCode from "react-qr-code";
import { Button } from "@/components/ui/button";
import { FaCheck, FaCopy, FaTimes } from "react-icons/fa";

export function getPublicDemoClassUrl(token) {
  const base =
    (typeof process !== "undefined" && process.env.NEXT_PUBLIC_PUBLIC_APP_URL) ||
    (typeof window !== "undefined" ? window.location.origin : "");
  return `${base.replace(/\/$/, "")}/demo-class?token=${encodeURIComponent(token)}`;
}

export default function DemoClassQrModal({ open, onClose, token }) {
  const [copied, setCopied] = useState(false);
  const qrRef = useRef(null);
  const url = useMemo(() => (token ? getPublicDemoClassUrl(token) : ""), [token]);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
  }, [open, token]);

  useEffect(() => {
    if (open) document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open || !token) return null;

  const copyLink = () => {
    navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const downloadQr = () => {
    const svg = qrRef.current?.querySelector("svg");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const a = document.createElement("a");
      a.download = `demo-class-qr-${token.slice(0, 8)}.png`;
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svgData)))}`;
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-lg border bg-background p-5 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">Global demo class QR</h3>
          <button type="button" onClick={onClose} className="rounded p-1 hover:bg-muted">
            <FaTimes />
          </button>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Anyone can scan this link to submit demo feedback. One global QR for the team.
        </p>
        <div ref={qrRef} className="mx-auto flex w-fit rounded-lg border bg-white p-4">
          <QRCode value={url} size={200} level="M" />
        </div>
        <p className="mt-3 text-center text-xs text-muted-foreground">Permanent team QR</p>
        <div className="mt-4 flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              readOnly
              value={url}
              className="min-w-0 flex-1 rounded-md border border-input bg-muted px-2 py-2 text-xs"
            />
            <Button type="button" variant="outline" size="sm" onClick={copyLink}>
              {copied ? <FaCheck className="text-green-600" /> : <FaCopy />}
            </Button>
          </div>
          <Button type="button" onClick={downloadQr}>
            Download QR PNG
          </Button>
        </div>
      </div>
    </div>
  );
}
