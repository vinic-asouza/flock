import {
  Church,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  type LucideIcon,
} from "lucide-react";
import type { OpsNavIcon } from "@/lib/opsNav";

export const OPS_NAV_ICONS: Record<OpsNavIcon, LucideIcon> = {
  overview: LayoutDashboard,
  churches: Church,
  waitlist: ClipboardList,
  health: HeartPulse,
};
