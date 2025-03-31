import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Route,
  Routes,
  Link,
  useNavigate,
} from "react-router-dom";
import { useUser } from "@/hooks/use-user";
import { useCanvasProjects } from "@/hooks/use-canvas-projects";
import { useToast } from "@/hooks/use-toast";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Home,
  LayoutDashboard,
  Settings,
  Canvas,
  Login,
  UserPlus,
  KeyRound,
  Image,
  Video,
  Bot,
  HelpCircle,
  Logout,
  CreditCard,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

import { MainLayout } from "@/components/layout/MainLayout";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Navbar } from "@/components/layout/Navbar";
import { Sidebar } from "@/components/layout/Sidebar";
import { Footer } from "@/components/layout/Footer";

import { CanvasPage } from "@/pages/CanvasPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { SettingsPage } from "@/pages/SettingsPage";
import { LoginPage } from "@/pages/LoginPage";
import { RegisterPage } from "@/pages/RegisterPage";
import { ForgotPasswordPage } from "@/pages/ForgotPasswordPage";
import { ResetPasswordPage } from "@/pages/ResetPasswordPage";
import { PricingPage } from "@/pages/PricingPage";
import { ImageToVideo } from "@/pages/ImageToVideo";
import { VideoCreatorPage } from "@/pages/VideoCreatorPage";
import { AIAgentPage } from "@/pages/AIAgentPage";
import { HelpPage } from "@/pages/HelpPage";
import ProductShot from "./pages/ProductShot";

const App = () => {
  return (
    <Router>
      <Routes>
        <Route
          path="/"
          element={
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          }
        />
        <Route
          path="/dashboard"
          element={
            <MainLayout>
              <DashboardPage />
            </MainLayout>
          }
        />
        <Route
          path="/canvas/:projectId"
          element={
            <MainLayout>
              <CanvasPage />
            </MainLayout>
          }
        />
        <Route
          path="/settings"
          element={
            <MainLayout>
              <SettingsPage />
            </MainLayout>
          }
        />
        <Route
          path="/plans"
          element={
            <MainLayout>
              <PricingPage />
            </MainLayout>
          }
        />
        <Route
          path="/image-to-video"
          element={
            <MainLayout>
              <ImageToVideo />
            </MainLayout>
          }
        />
        <Route
          path="/video-creator"
          element={
            <MainLayout>
              <VideoCreatorPage />
            </MainLayout>
          }
        />
        <Route
          path="/ai-agent"
          element={
            <MainLayout>
              <AIAgentPage />
            </MainLayout>
          }
        />
        <Route
          path="/help"
          element={
            <MainLayout>
              <HelpPage />
            </MainLayout>
          }
        />
        <Route
          path="/auth/login"
          element={
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          }
        />
        <Route
          path="/auth/register"
          element={
            <AuthLayout>
              <RegisterPage />
            </AuthLayout>
          }
        />
        <Route
          path="/auth/forgot-password"
          element={
            <AuthLayout>
              <ForgotPasswordPage />
            </AuthLayout>
          }
        />
        <Route
          path="/auth/reset-password"
          element={
            <AuthLayout>
              <ResetPasswordPage />
            </AuthLayout>
          }
        />
        <Route
          path="/product-shot"
          element={
            <MainLayout>
              <ProductShot />
            </MainLayout>
          }
        />
      </Routes>
    </Router>
  );
};

export default App;
