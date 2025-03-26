
import React from "react";
import { BrowserUseApp } from "@/components/browser-use/BrowserUseApp";
import { useIsMobile } from "@/hooks/use-mobile";

const BrowserUsePage = () => {
  const isMobile = useIsMobile();
  
  return (
    <div className={`${isMobile ? 'pb-16' : ''}`}>
      <BrowserUseApp />
    </div>
  );
};

export default BrowserUsePage;
