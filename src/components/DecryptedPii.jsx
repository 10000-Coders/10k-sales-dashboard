"use client";

import { useEffect, useState } from "react";
import { decryptStudentPii, isClientEncrypted } from "@/lib/studentPiiCrypto";

export default function DecryptedPii({ value, fallback = "—" }) {
  const [text, setText] = useState(() =>
    isClientEncrypted(value) ? "" : value || ""
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const next = await decryptStudentPii(value);
      if (!cancelled) setText(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [value]);

  return <>{text || fallback}</>;
}
