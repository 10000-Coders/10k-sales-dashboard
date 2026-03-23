"use client";

import { Info } from "lucide-react";
import { ROLE_RESPONSIBILITIES } from "@/lib/dashboardConstants";

function formatRoleLabel(role) {
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function RoleResponsibilities({ role }) {
  const items = role ? ROLE_RESPONSIBILITIES[role] : null;
  if (!items?.length) return null;

  return (
    <div className="rounded-lg border bg-muted/30 p-4 pt-3">
      <h3 className="font-semibold flex items-center gap-2 mb-2">
        <Info className="h-4 w-4 text-muted-foreground" />
        Your responsibilities — {formatRoleLabel(role)}
      </h3>
      <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
        {items.map((item, i) => (
          <li key={i}>{item}</li>
        ))}
      </ol>
    </div>
  );
}
