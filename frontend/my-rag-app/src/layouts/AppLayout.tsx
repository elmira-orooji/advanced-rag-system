import type { ReactNode } from "react";
import SidebarV2 from "../components/SidebarV2";

interface AppLayoutProps {
  children: ReactNode;
}

export default function AppLayout({
  children,
}: AppLayoutProps) {

  return (
    <div className="flex min-h-screen bg-[#F6F8FC]">
     <SidebarV2 />

      <main
        className="
          flex-1
          px-10
          py-8
          overflow-y-auto
        "
      >
        {children}
      </main>
    </div>
  );
}