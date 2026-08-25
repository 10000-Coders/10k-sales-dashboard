"use client";

import { useEffect, useState } from "react";
import axios from "@/axios";
import { decryptPaymentImageBytes } from "@/lib/studentPiiCrypto";

export default function EncryptedPaymentImage({
  paymentId,
  field,
  alt = "",
  className,
  style,
}) {
  const [src, setSrc] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!paymentId || !field) return undefined;
    let cancelled = false;
    let objectUrl;
    setSrc(null);
    setError("");
    (async () => {
      const res = await axios.get(`/payments/${paymentId}/file/`, {
        params: { field },
        responseType: "arraybuffer",
      });
      const plain = await decryptPaymentImageBytes(res.data);
      objectUrl = URL.createObjectURL(new Blob([plain]));
      if (!cancelled) setSrc(objectUrl);
    })().catch(() => {
      if (!cancelled) setError("Could not load image.");
    });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [paymentId, field]);

  if (error) {
    return <p className="text-sm text-muted-foreground">{error}</p>;
  }
  if (!src) {
    return <p className="text-sm text-muted-foreground">Loading image…</p>;
  }
  return <img src={src} alt={alt} className={className} style={style} draggable={false} />;
}
