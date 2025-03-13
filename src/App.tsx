
import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { Layout } from "@/components/Layout";
import Explore from "@/pages/Explore";
import { Dashboard } from "@/components/Dashboard";
import AIAgent from "@/pages/AIAgent";
import VideoTemplates from "@/pages/VideoTemplates";
import Plans from "@/pages/Plans";
import ProfileSettings from "@/pages/ProfileSettings";
import Auth from "@/pages/Auth";
import AboutUs from "@/pages/AboutUs";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import CustomOrders from "@/pages/CustomOrders";
import Admin from "@/pages/Admin";
import CustomOrderForm from "@/pages/CustomOrderForm";
import VideoTemplates from "@/pages/VideoTemplates";
import { ThemeProvider } from "@/components/ui/ThemeProvider";
import { BottomNav } from "@/components/mobile/BottomNav";
import Messages from "@/pages/Messages";

const router = createBrowserRouter([
  {
    path: "/",
    element: <Auth />,
  },
  {
    path: "/auth/*",
    element: <Auth />,
  },
  {
    path: "/explore",
    element: <Layout>
      <Explore />
    </Layout>,
  },
  {
    path: "/dashboard",
    element: <Layout>
      <Dashboard />
    </Layout>,
  },
  {
    path: "/ai-agent",
    element: <Layout>
      <AIAgent />
    </Layout>,
  },
  {
    path: "/video-templates",
    element: <Layout>
      <VideoTemplates />
    </Layout>,
  },
  {
    path: "/video-templates/:id",
    element: <Layout>
      <VideoTemplates />
    </Layout>,
  },
  {
    path: "/plans",
    element: <Layout>
      <Plans />
    </Layout>,
  },
  {
    path: "/profile",
    element: <Layout>
      <ProfileSettings />
    </Layout>,
  },
  {
    path: "/about",
    element: <Layout>
      <AboutUs />
    </Layout>,
  },
  {
    path: "/contact",
    element: <Layout>
      <Contact />
    </Layout>,
  },
  {
    path: "/privacy",
    element: <Layout>
      <Privacy />
    </Layout>,
  },
  {
    path: "/terms",
    element: <Layout>
      <Terms />
    </Layout>,
  },
  {
    path: "/custom-orders",
    element: <Layout>
      <CustomOrders />
    </Layout>,
  },
  {
    path: "/custom-orders/:id",
    element: <Layout>
      <CustomOrderForm />
    </Layout>,
  },
  {
    path: "/admin",
    element: <Layout>
      <Admin />
    </Layout>,
  },
  {
    path: "/messages",
    element: <Layout>
      <Messages />
    </Layout>,
  },
]);

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <RouterProvider router={router} />
      <BottomNav />
    </ThemeProvider>
  );
}

export default App;
