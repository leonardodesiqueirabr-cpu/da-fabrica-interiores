export const ADMIN_CATEGORIES = [
  { slug: "sofas", label: "Sofas" },
  { slug: "camas", label: "Camas" },
  { slug: "colchoes", label: "Colchoes" },
  { slug: "sala", label: "Sala" },
];

// Categories kept in the database and on existing products, but hidden in the admin UI.
// The forms keep them in state, so saving a product does not remove them.
export const HIDDEN_ADMIN_CATEGORY_SLUGS = new Set(["sala"]);

export const VISIBLE_ADMIN_CATEGORIES = ADMIN_CATEGORIES.filter(
  (category) => !HIDDEN_ADMIN_CATEGORY_SLUGS.has(category.slug),
);
