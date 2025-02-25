import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "@/pages/Index";
import Auth from "@/pages/Auth";
import ProfileSettings from "@/pages/ProfileSettings";
import WorkRequests from "@/pages/WorkRequests";
import Plans from "@/pages/Plans";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/auth/*" element={<Auth />} />
        <Route path="/profile-settings" element={<ProfileSettings />} />
        <Route path="/work-requests" element={<WorkRequests />} />
        <Route path="/plans" element={<Plans />} />
      </Routes>
    </BrowserRouter>
  );
}
