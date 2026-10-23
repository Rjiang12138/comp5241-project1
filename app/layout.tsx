import type { Metadata } from "next";
import "./globals.css";
import "./additions.css";
import PrototypeScripts from "@/components/PrototypeScripts";

export const metadata: Metadata = {
  title: "Praxis — AI course studio for software engineering",
  description:
    "Praxis turns lecture material into interactive mini-courses: generated modules, hands-on activities, and evidence about where a cohort actually stalls.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <PrototypeScripts />
      </body>
    </html>
  );
}
