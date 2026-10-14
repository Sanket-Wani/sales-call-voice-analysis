import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Real Estate Call Intelligence | Evidence-First Platform",
  description:
    "Evidence-first AI call analysis web application for real estate leadership, sales managers, and reviewers. Every claim traceable to original audio and transcript evidence.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen bg-neutral-50/50 text-neutral-900">
        {children}
      </body>
    </html>
  );
}
