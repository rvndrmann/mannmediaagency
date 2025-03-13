import React from 'react';
import {
  createBrowserRouter,
  RouterProvider,
} from "react-router-dom";
import { Layout } from "@/components/Layout";
import Explore from "@/pages/Explore";
import Dashboard from "@/pages/Dashboard";
import AIAgent from "@/pages/AIAgent";
import VideoTemplates from "@/pages/VideoTemplates";
import Plans from "@/pages/Plans";
import Profile from "@/pages/Profile";
import Auth from "@/pages/Auth";
import About from "@/pages/About";
import Contact from "@/pages/Contact";
import Privacy from "@/pages/Privacy";
import Terms from "@/pages/Terms";
import CustomOrders from "@/pages/CustomOrders";
import Admin from "@/pages/Admin";
import CustomOrderDetails from "@/pages/CustomOrderDetails";
import VideoTemplateDetails from "@/pages/VideoTemplateDetails";
import { ThemeProvider } from "@/components/ui/theme-provider"
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
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Explore />,
      },
    ],
  },
  {
    path: "/dashboard",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Dashboard />,
      },
    ],
  },
  {
    path: "/ai-agent",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <AIAgent />,
      },
    ],
  },
  {
    path: "/video-templates",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <VideoTemplates />,
      },
    ],
  },
  {
    path: "/video-templates/:id",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <VideoTemplateDetails />,
      },
    ],
  },
  {
    path: "/plans",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Plans />,
      },
    ],
  },
  {
    path: "/profile",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Profile />,
      },
    ],
  },
  {
    path: "/about",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <About />,
      },
    ],
  },
  {
    path: "/contact",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Contact />,
      },
    ],
  },
  {
    path: "/privacy",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Privacy />,
      },
    ],
  },
  {
    path: "/terms",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Terms />,
      },
    ],
  },
  {
    path: "/custom-orders",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <CustomOrders />,
      },
    ],
  },
  {
    path: "/custom-orders/:id",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <CustomOrderDetails />,
      },
    ],
  },
  {
    path: "/admin",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Admin />,
      },
    ],
  },
  {
    path: "/messages",
    element: <Layout />,
    children: [
      {
        index: true,
        element: <Messages />,
      },
    ],
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

export default App
