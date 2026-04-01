"use client";

import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { FollowUpNotification } from "@/components/FollowUpNotification";
import { cn } from "@/lib/utils";
import { User, Mail, Shield, Phone, ChevronDown, Menu } from "lucide-react";

function getInitial(name) {
  if (!name || typeof name !== "string") return "?";
  const trimmed = name.trim();
  return trimmed.charAt(0).toUpperCase() || "?";
}

function getRoleLabel(role) {
  if (!role) return "";
  const r = String(role).toLowerCase();
  return r.charAt(0).toUpperCase() + r.slice(1);
}

export default function TopNavbar({ onMenuClick }) {
  const user = useSelector((state) => state.userAuth?.user);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="z-40 flex h-[3.25rem] shrink-0 items-center justify-between border-b border-border/80 bg-background/95 px-4 shadow-sm backdrop-blur-md sm:h-14 sm:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        {typeof onMenuClick === "function" ? (
          <button
            type="button"
            onClick={onMenuClick}
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border/80 bg-background text-foreground shadow-sm transition-colors hover:bg-muted lg:hidden"
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" />
          </button>
        ) : null}
        <div className="min-w-0">
          <h1 className="truncate text-base font-semibold tracking-tight text-foreground sm:text-lg">
            Sales Dashboard
          </h1>
          <p className="hidden text-[11px] font-medium uppercase tracking-wider text-muted-foreground sm:block">
            10000coders · Operations
          </p>
        </div>
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <FollowUpNotification />
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 rounded-full p-1 transition-colors hover:bg-muted/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <div className="hidden flex-col items-end sm:flex">
                  <span className="max-w-[140px] truncate text-sm font-semibold text-foreground">
                    {user.name}
                  </span>
                  <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                    {getRoleLabel(user.role)}
                  </span>
                </div>
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-primary-foreground shadow-md ring-2 ring-primary/20 transition-transform active:scale-95",
                    "bg-primary"
                  )}
                >
                  {getInitial(user.name)}
                </div>
                <ChevronDown
                  className={cn(
                    "hidden h-4 w-4 text-muted-foreground transition-transform duration-200 sm:block",
                    isOpen && "rotate-180"
                  )}
                />
              </button>

              <div
                className={cn(
                  "absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] origin-top-right overflow-hidden rounded-2xl border border-border/80 bg-card shadow-xl ring-1 ring-black/5 transition-all duration-200 ease-out",
                  isOpen ? "scale-100 opacity-100 translate-y-0" : "pointer-events-none scale-95 opacity-0 -translate-y-2"
                )}
              >
                <div className="bg-gradient-to-br from-primary to-orange-600 p-6 text-primary-foreground">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/20 text-xl font-bold backdrop-blur-sm">
                    {getInitial(user.name)}
                  </div>
                  <h3 className="text-lg font-bold leading-tight">{user.name}</h3>
                  <p className="mt-0.5 text-sm text-white/90">{getRoleLabel(user.role)}</p>
                </div>

                <div className="space-y-1 p-3">
                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Full name
                      </span>
                      <span className="text-sm font-medium text-foreground">{user.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex flex-col overflow-hidden">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Email
                      </span>
                      <span className="truncate text-sm font-medium text-foreground">
                        {user.email || "No email provided"}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Personal mobile
                      </span>
                      <span className="text-sm font-medium text-foreground">{user.personal_mobile || "—"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Company mobile
                      </span>
                      <span className="text-sm font-medium text-foreground">{user.company_mobile || "—"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-muted/60">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                        Access
                      </span>
                      <span className="text-sm font-medium text-foreground">{getRoleLabel(user.role)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border/60 bg-muted/30 px-4 py-3">
                  <p className="text-center text-[10px] font-medium text-muted-foreground">
                    10000coders Sales Dashboard
                  </p>
                </div>
              </div>
            </div>
          </>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        )}
      </div>
    </header>
  );
}
