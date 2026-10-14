"use client";

import Link from "next/link";
import { LayoutDashboard } from "lucide-react";

export function Navbar({
  activeTab = "dashboard",
  totalCallsCount = 0,
}: {
  activeTab?: string;
  totalCallsCount?: number;
}) {
  return (
    <header className="border-b border-neutral-200 bg-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          {/* Brand Icon + Name */}
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-md bg-neutral-900 text-white flex items-center justify-center font-bold tracking-tight text-lg shadow-sm group-hover:bg-neutral-800 transition">
              VC
            </div>
            <div>
              <span className="font-semibold text-neutral-900 tracking-tight block text-sm sm:text-base leading-tight">
                Real Estate Call Intelligence
              </span>
              <span className="text-[11px] text-neutral-500 block leading-tight font-normal">
                Evidence-First Traceability & QA Audit
              </span>
            </div>
          </Link>

          {/* Nav Links */}
          <nav className="flex items-center gap-1 sm:gap-2">
            <Link
              href="/"
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-md text-xs sm:text-sm font-medium transition-colors ${
                activeTab === "dashboard"
                  ? "bg-neutral-100 text-neutral-900 font-semibold"
                  : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
              }`}
            >
              <LayoutDashboard className="w-4 h-4 text-neutral-500" />
              <span>Dashboard</span>
              {totalCallsCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-neutral-200 text-neutral-800">
                  {totalCallsCount}
                </span>
              )}
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
