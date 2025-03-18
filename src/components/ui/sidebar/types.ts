
import { VariantProps } from "class-variance-authority";
import { sidebarMenuButtonVariants } from "./menu-button";
import { LucideIcon } from "lucide-react";

export type SidebarContext = {
  state: "expanded" | "collapsed";
  open: boolean;
  setOpen: (open: boolean) => void;
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void;
};

export type SidebarMenuButtonProps = React.ComponentProps<"button"> & {
  asChild?: boolean;
  isActive?: boolean;
  tooltip?: string | React.ComponentProps<any>;
  badge?: number;
} & VariantProps<typeof sidebarMenuButtonVariants>;

export interface BaseNavigationItem {
  name: string;
  to?: string;
  icon: LucideIcon;
  subtext?: string;
  disabled?: boolean;
  comingSoon?: boolean;
  current?: boolean;
}

export interface NavigationItemWithBadge extends BaseNavigationItem {
  badge?: number;
}

export interface AdminNavigationItem extends BaseNavigationItem {
  adminOnly?: boolean;
}

export interface IntegrationsNavigationItem extends BaseNavigationItem {
  disabled: true;
  comingSoon: true;
}

export type NavigationItem = NavigationItemWithBadge | AdminNavigationItem | IntegrationsNavigationItem;
