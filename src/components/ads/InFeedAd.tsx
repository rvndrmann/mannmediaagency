
import { useEffect } from "react";

declare global {
  interface Window {
    adsbygoogle: any[];
  }
}

export const InFeedAd = () => {
  useEffect(() => {
    try {
      (window.adsbygoogle = window.adsbygoogle || []).push({});
    } catch (err) {
      console.error("Error loading AdSense ad:", err);
    }
  }, []);

  return (
    <div className="my-4 w-full">
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-format="fluid"
        data-ad-layout-key="-ef+6k-30-ac+ty"
        data-ad-client="ca-pub-2887156217028906"
        data-ad-slot="9378065091"
      />
    </div>
  );
};
