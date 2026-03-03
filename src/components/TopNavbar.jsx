"use client";

import { useState, useRef, useEffect } from "react";
import { useSelector } from "react-redux";
import { FollowUpNotification } from "@/components/FollowUpNotification";
import { cn } from "@/lib/utils";
import { User, Mail, Shield, Phone, ChevronDown } from "lucide-react";

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

export default function TopNavbar() {
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
    <header className="sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background px-4 sm:px-6">
      <div className="flex items-center">
        <h1 className="text-lg font-bold tracking-tight text-foreground sm:text-xl">
          Sales Dashboard
        </h1>
      </div>
      <div className="flex items-center gap-4">
        {user ? (
          <>
            <FollowUpNotification />
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 rounded-full p-1 transition-all hover:bg-gray-100 focus:outline-none"
              >
                <div className="hidden flex-col items-end sm:flex">
                  <span className="text-sm font-semibold text-foreground">
                    {user.name}
                  </span>
                  <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                    {getRoleLabel(user.role)}
                  </span>
                </div>
                <div
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold text-white shadow-sm transition-transform active:scale-95",
                    "bg-[#FF8000]"
                  )}
                >
                  {getInitial(user.name)}
                </div>
                <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform duration-200", isOpen && "rotate-180")} />
              </button>

              {/* Profile Details Box with Animation */}
              <div
                className={cn(
                  "absolute right-0 mt-2 w-72 origin-top-right overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl transition-all duration-200 ease-out",
                  isOpen 
                    ? "scale-100 opacity-100 translate-y-0" 
                    : "scale-95 opacity-0 -translate-y-2 pointer-events-none"
                )}
              >
                <div className="bg-[#FF8000] p-6 text-white">
                  <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/20 text-2xl font-bold backdrop-blur-sm">
                    {getInitial(user.name)}
                  </div>
                  <h3 className="text-lg font-bold">{user.name}</h3>
                  <p className="text-sm text-white/80">{getRoleLabel(user.role)}</p>
                </div>
                
                <div className="p-4 space-y-4">
                  <div className="flex items-center gap-3 px-2 py-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                      <User className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Full Name</span>
                      <span className="text-sm font-medium text-gray-700">{user.name}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-2 py-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                      <Mail className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col overflow-hidden">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Email</span>
                      <span className="text-sm font-medium text-gray-700 truncate">{user.email || "No email provided"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-2 py-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Personal mobile</span>
                      <span className="text-sm font-medium text-gray-700">{user.personal_mobile || "—"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-2 py-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                      <Phone className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Company mobile</span>
                      <span className="text-sm font-medium text-gray-700">{user.company_mobile || "—"}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 px-2 py-1">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gray-50 text-gray-500">
                      <Shield className="h-4 w-4" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">System Access</span>
                      <span className="text-sm font-medium text-gray-700">{getRoleLabel(user.role)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t border-gray-50 bg-gray-50/50 p-4">
                  <p className="text-center text-[10px] font-medium text-gray-400">
                    Product 10000 Coders Sales Dashboard v1.0
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
