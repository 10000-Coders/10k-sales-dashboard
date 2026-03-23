"use client";

import { useState, useCallback } from "react";
import SideBar from "@/components/SideBar";
import TopNavbar from "@/components/TopNavbar";

/**
 * Responsive shell: sidebar is fixed on desktop; on mobile it slides in as a drawer.
 * Main column scrolls independently so tables/cards don’t break the layout.
 */
export default function AppShell({ children }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const closeMobile = useCallback(() => setMobileNavOpen(false), []);
  const openMobile = useCallback(() => setMobileNavOpen(true), []);

  return (
    <div className="flex min-h-screen w-full min-w-0 max-w-full overflow-x-hidden bg-[hsl(var(--background))]">
      <SideBar mobileOpen={mobileNavOpen} onMobileClose={closeMobile} />

      {/* Mobile overlay: tap to close */}
      {mobileNavOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-20 bg-black/40 lg:hidden"
          aria-label="Close navigation menu"
          onClick={closeMobile}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden lg:ml-[250px]">
        <TopNavbar onMenuClick={openMobile} />
        <main className="flex min-h-0 min-w-0 max-w-full flex-1 flex-col overflow-x-hidden overflow-y-auto bg-gradient-to-b from-slate-50/90 via-slate-50/50 to-slate-100/30">
          {children}
        </main>
      </div>
    </div>
  );
}
