export interface BreadcrumbItem {
  label: string;
  href?: string;
}

const SEGMENT_LABEL_MAP: Record<string, string> = {
  inicio: "Início",
  categorias: "Categorias",
  sofas: "Sofás",
  camas: "Camas",
  colchoes: "Colchões",
  sala: "Sala",
  "mais-vendidos": "Mais vendidos",
  produtos: "Todos os produtos",
  produto: "Produto",
};

const NON_NAVIGABLE_SEGMENTS = new Set(["categorias", "produto"]);
const HIDDEN_SEGMENTS = new Set(["categorias", "produto"]);

function toLabel(segment: string) {
  const normalized = segment.toLowerCase();
  if (SEGMENT_LABEL_MAP[normalized]) {
    return SEGMENT_LABEL_MAP[normalized];
  }

  return segment
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeFromPath(fromPath: string | undefined) {
  if (!fromPath || !fromPath.startsWith("/")) {
    return undefined;
  }

  return fromPath.split("?")[0];
}

export function buildBreadcrumbFromOrigin(fromPath: string | undefined, currentLabel: string): BreadcrumbItem[] {
  const normalizedFromPath = normalizeFromPath(fromPath);
  const items: BreadcrumbItem[] = [{ label: "Início", href: "/" }];

  if (normalizedFromPath && normalizedFromPath !== "/") {
    const segments = normalizedFromPath.split("/").filter(Boolean);
    let currentPath = "";

    for (const segment of segments) {
      currentPath += `/${segment}`;

      if (HIDDEN_SEGMENTS.has(segment.toLowerCase())) {
        continue;
      }

      items.push({
        label: toLabel(segment),
        href: NON_NAVIGABLE_SEGMENTS.has(segment.toLowerCase()) ? undefined : currentPath,
      });
    }
  }

  items.push({ label: currentLabel });

  const deduped: BreadcrumbItem[] = [];
  for (const item of items) {
    const previous = deduped[deduped.length - 1];
    if (previous?.label === item.label) {
      continue;
    }
    deduped.push(item);
  }

  return deduped;
}
