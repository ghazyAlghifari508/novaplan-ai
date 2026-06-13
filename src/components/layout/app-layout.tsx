"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { Navbar } from "./navbar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  
  // Hide navbar on auth pages to provide a clean full-screen experience
  const hideNavbarRoutes = ["/login", "/register", "/forgot-password", "/reset-password"];
  const hideNavbar = hideNavbarRoutes.includes(pathname) || pathname.startsWith("/settings");
  
  // Lock body scroll on workspace to prevent overscroll rubber-banding
  const isWorkspace = pathname.startsWith("/prd");

  useEffect(() => {
    if (isWorkspace) {
      document.body.style.overflow = "hidden";
      document.body.style.overscrollBehaviorY = "none";
    } else {
      document.body.style.overflow = "";
      document.body.style.overscrollBehaviorY = "";
    }
    
    return () => {
      document.body.style.overflow = "";
      document.body.style.overscrollBehaviorY = "";
    };
  }, [isWorkspace]);

  return (
    <>
      {!hideNavbar && <Navbar />}
      <div 
        className={
          hideNavbar 
            ? "flex flex-col min-h-screen" 
            : isWorkspace
              ? "pt-14 flex flex-col h-screen overflow-hidden"
              : "pt-14 flex flex-col min-h-screen"
        }
      >
        {children}
      </div>
    </>
  );
}
