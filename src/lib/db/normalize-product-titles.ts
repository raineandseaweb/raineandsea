import { eq } from "drizzle-orm";
import {
  categories,
  db,
  productCategories,
  productCrystals,
  products,
} from "./index";

interface ProductRecord {
  id: string;
  slug: string;
  title: string;
}

interface ProductAggregate extends ProductRecord {
  categoryNames: string[];
  categorySlugs: string[];
  defaultCrystal?: string | null;
  crystals?: string[];
}

// Optional explicit overrides for specific products by slug
const TITLE_OVERRIDES: Record<string, string> = {
  // "fire-and-ice-crackle-quartz-sphere": "Crackle Quartz Sphere", // example
};

const CATEGORY_TYPE_PRIORITY: Array<{
  match: RegExp;
  type: string;
  includeCrystal: boolean;
}> = [
  { match: /earring/i, type: "Earrings", includeCrystal: true },
  { match: /bracelet/i, type: "Bracelet", includeCrystal: true },
  { match: /necklace|pendant/i, type: "Necklace", includeCrystal: true },
  { match: /ring/i, type: "Ring", includeCrystal: true },
  { match: /tower/i, type: "Tower", includeCrystal: true },
  { match: /tumble/i, type: "Tumble", includeCrystal: true },
  { match: /sphere/i, type: "Sphere", includeCrystal: true },
  { match: /cube/i, type: "Cube", includeCrystal: true },
  { match: /pyramid/i, type: "Pyramid", includeCrystal: true },
  { match: /egg/i, type: "Egg", includeCrystal: true },
  { match: /point/i, type: "Point", includeCrystal: true },
  { match: /cluster/i, type: "Cluster", includeCrystal: true },
  { match: /specimen|raw/i, type: "Specimen", includeCrystal: true },
  { match: /jewelry\s*box/i, type: "Jewelry Box", includeCrystal: false },
  { match: /keychain/i, type: "Keychain", includeCrystal: true },
  { match: /wire\s*tree/i, type: "Wire Tree", includeCrystal: true },
];

function determineTypeFromCategories(categoryNames: string[]): {
  type: string | null;
  includeCrystal: boolean;
} {
  for (const { match, type, includeCrystal } of CATEGORY_TYPE_PRIORITY) {
    if (categoryNames.some((name) => match.test(name))) {
      return { type, includeCrystal };
    }
  }
  return { type: null, includeCrystal: true };
}

function buildTitle(
  p: ProductAggregate,
  allCrystalNames: Set<string>
): string | null {
  if (TITLE_OVERRIDES[p.slug]) return TITLE_OVERRIDES[p.slug];

  const { type, includeCrystal } = determineTypeFromCategories(p.categoryNames);

  // Fallback: if no category match, leave as-is (we will not risk breaking)
  if (!type) return null;

  // Determine a crystal name deterministically
  let crystal = p.defaultCrystal?.trim() || null;
  // 1) Use first product-specific crystal if no default
  if (!crystal && p.crystals && p.crystals.length > 0) {
    crystal =
      p.crystals.find((c) => c && c.length >= 4) || p.crystals[0] || null;
  }
  // 2) Try to parse from original title using dictionary of known crystals (length >= 4)
  if (!crystal) {
    const lower = p.title.toLowerCase();
    for (const name of allCrystalNames) {
      if (!name || name.length < 4) continue;
      const n = name.toLowerCase();
      // Whole word-ish match (allow spaces/dashes in names)
      const re = new RegExp(
        `(^|\\b)${n.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&")}(\\b|$)`
      );
      if (re.test(lower)) {
        crystal = name;
        break;
      }
    }
  }

  // Rules
  // - If includeCrystal and we have a default crystal → "<Crystal> <Type>"
  // - Else → "<Type>"
  if (includeCrystal && crystal) {
    return `${crystal} ${type}`.replace(/\s+/g, " ").trim();
  }
  // Heuristics per type when no crystal is available
  const slugLower = p.slug.toLowerCase();
  const titleLower = p.title.toLowerCase();

  // Utility to title-case a phrase
  const titleCase = (phrase: string) =>
    phrase
      .split(/\s|-/)
      .filter(Boolean)
      .map((w) => (w.length > 2 ? w[0].toUpperCase() + w.slice(1) : w))
      .join(" ");

  // Extract color words from slug/title
  const colorWords = [
    "green",
    "pink",
    "purple",
    "black",
    "white",
    "blue",
    "red",
    "yellow",
    "orange",
    "grey",
    "gray",
    "charcoal",
    "holo",
    "holographic",
  ];
  const foundColors = colorWords.filter(
    (c) => slugLower.includes(c) || titleLower.includes(c)
  );
  const colorLabel = foundColors
    .map((c) => (c === "holo" ? "Holo" : titleCase(c)))
    .join(" ")
    .replace(/\bGrey\b/i, "Grey")
    .replace(/\bGray\b/i, "Gray");

  if (type === "Wire Tree") {
    const isWeepingWillow =
      slugLower.includes("weeping-willow") ||
      titleLower.includes("weeping willow");
    const style = isWeepingWillow ? "Weeping Willow " : "";
    const colorPart = colorLabel ? `${colorLabel} ` : "";
    return `${colorPart}${style}Wire Tree`.trim();
  }

  if (type === "Jewelry Box") {
    let size = "";
    if (slugLower.includes("50")) size = " (Large)";
    else if (slugLower.includes("25")) size = " (Small)";
    return `Mystery Jewelry Box${size}`;
  }

  if (type === "Sphere") {
    if (
      slugLower.includes("crackle-quartz") ||
      slugLower.includes("fire-and-ice")
    ) {
      return "Crackle Quartz Sphere";
    }
  }

  if (type === "Bracelet") {
    const isFrosted =
      slugLower.includes("frosted-glass") || titleLower.includes("frosted");
    const isSeaInspired =
      slugLower.includes("sea-inspired") ||
      titleLower.includes("sea inspired") ||
      slugLower.includes("mermaid");

    if (isFrosted) {
      let colorTitle = "";
      if (foundColors.length >= 2) {
        colorTitle = `${titleCase(foundColors[0])} and ${titleCase(
          foundColors[1]
        )}`;
      } else if (foundColors.length === 1) {
        colorTitle = titleCase(foundColors[0]);
      }

      const parts: string[] = [];
      if (colorTitle) parts.push(colorTitle);
      if (isSeaInspired) parts.push("Sea Inspired");
      const prefix = parts.length ? `${parts.join(" ")} ` : "";
      return `${prefix}Frosted Glass Bracelet`;
    }
    if (slugLower.includes("marble-glass")) return "Marble Glass Bracelet";
    if (slugLower.includes("sea-glass") || slugLower.includes("sea-inspired"))
      return colorLabel
        ? `${colorLabel} Sea Glass Bracelet`
        : "Sea Glass Bracelet";
    if (slugLower.includes("soulmate-chakra"))
      return "Soulmate Chakra Bracelet Set";
    if (slugLower.includes("wire-braided")) return "Wire-Braided Bracelet";
    if (
      colorLabel &&
      (slugLower.includes("frosted") || slugLower.includes("glass"))
    ) {
      return `${colorLabel} Frosted Glass Bracelet`;
    }
  }

  if (type === "Earrings") {
    if (slugLower.includes("bottle")) return "Bottle Earrings";
    if (slugLower.includes("moon")) return "Crescent Moon Earrings";
  }

  return type;
}

async function fetchAggregatedProducts(): Promise<{
  rows: ProductAggregate[];
  allCrystalNames: Set<string>;
}> {
  // Fetch base products
  const baseRows = await db
    .select({ id: products.id, slug: products.slug, title: products.title })
    .from(products);

  // Fetch categories per product
  const pcRows = await db
    .select({
      productId: productCategories.product_id,
      name: categories.name,
      slug: categories.slug,
    })
    .from(productCategories)
    .leftJoin(categories, eq(productCategories.category_id, categories.id));

  // Fetch default crystals per product
  const crystalRows = await db
    .select({
      productId: productCrystals.product_id,
      name: productCrystals.name,
      isDefault: productCrystals.is_default,
    })
    .from(productCrystals);

  const catsByProduct = new Map<string, { names: string[]; slugs: string[] }>();
  for (const row of pcRows) {
    const entry = catsByProduct.get(row.productId) || { names: [], slugs: [] };
    if (row.name) entry.names.push(row.name);
    if (row.slug) entry.slugs.push(row.slug);
    catsByProduct.set(row.productId, entry);
  }

  const defaultCrystalByProduct = new Map<string, string | null>();
  const allCrystalNames = new Set<string>();
  const crystalsByProduct = new Map<string, string[]>();
  for (const row of crystalRows) {
    const current = defaultCrystalByProduct.get(row.productId);
    if (row.isDefault) {
      defaultCrystalByProduct.set(row.productId, row.name || null);
    } else if (current == null) {
      // If no default explicitly set, remember the first seen crystal as tentative fallback
      defaultCrystalByProduct.set(row.productId, row.name || null);
    }
    if (row.name) allCrystalNames.add(row.name);
    if (row.productId) {
      const list = crystalsByProduct.get(row.productId) || [];
      if (row.name) list.push(row.name);
      crystalsByProduct.set(row.productId, list);
    }
  }

  return {
    rows: baseRows.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      categoryNames: catsByProduct.get(b.id)?.names || [],
      categorySlugs: catsByProduct.get(b.id)?.slugs || [],
      defaultCrystal: defaultCrystalByProduct.get(b.id) || null,
      crystals: crystalsByProduct.get(b.id) || [],
    })),
    allCrystalNames,
  };
}

async function main() {
  const write = process.argv.includes("--write");

  const { rows: records, allCrystalNames } = await fetchAggregatedProducts();
  let updatedCount = 0;

  for (const rec of records) {
    const newTitle = buildTitle(rec, allCrystalNames);
    if (!newTitle || newTitle === rec.title) {
      continue;
    }

    if (write) {
      await db
        .update(products)
        .set({ title: newTitle })
        .where(eq(products.id, rec.id));
    }
    updatedCount++;
    console.log(
      `${rec.slug}: "${rec.title}" -> "${newTitle}"${
        write ? " [UPDATED]" : " [DRY-RUN]"
      }`
    );
  }

  console.log(
    `${write ? "Updated" : "Would update"} ${updatedCount} product title(s).`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
