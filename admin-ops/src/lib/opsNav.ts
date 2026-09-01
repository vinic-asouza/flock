export const OPS_BRAND = "Flock Admin OPS";

export type OpsNavMatch = "exact" | "prefix";
export type OpsNavIcon = "overview" | "churches" | "waitlist" | "health";

export interface OpsNavItem {
  href: string;
  label: string;
  match: OpsNavMatch;
  icon: OpsNavIcon;
}

export interface OpsNavGroup {
  id: "operation" | "platform";
  label: string;
  items: OpsNavItem[];
}

export const OPS_NAV_GROUPS: OpsNavGroup[] = [
  {
    id: "operation",
    label: "Operação",
    items: [
      { href: "/", label: "Visão geral", match: "exact", icon: "overview" },
      { href: "/churches", label: "Igrejas", match: "prefix", icon: "churches" },
      {
        href: "/waitlist",
        label: "Lista de espera",
        match: "exact",
        icon: "waitlist",
      },
    ],
  },
  {
    id: "platform",
    label: "Plataforma",
    items: [{ href: "/health", label: "Saúde", match: "exact", icon: "health" }],
  },
];

export const OPS_NAV_ITEMS: OpsNavItem[] = OPS_NAV_GROUPS.flatMap(
  (group) => group.items
);

export function isOpsNavCurrent(
  pathname: string,
  item: OpsNavItem
): boolean {
  if (item.match === "exact") {
    return pathname === item.href;
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
