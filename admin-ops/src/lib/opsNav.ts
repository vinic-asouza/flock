export const OPS_BRAND = "Flock Admin OPS";

export type OpsNavMatch = "exact" | "prefix";

export interface OpsNavItem {
  href: string;
  label: string;
  match: OpsNavMatch;
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
      { href: "/", label: "Visão geral", match: "exact" },
      { href: "/churches", label: "Igrejas", match: "prefix" },
      { href: "/waitlist", label: "Lista de espera", match: "exact" },
    ],
  },
  {
    id: "platform",
    label: "Plataforma",
    items: [{ href: "/health", label: "Saúde", match: "exact" }],
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
