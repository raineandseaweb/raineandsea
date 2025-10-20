import { eq } from "drizzle-orm";
import {
  categories,
  db,
  productCategories,
  productCrystals,
  products,
} from "./index";

interface ProductAgg {
  id: string;
  slug: string;
  title: string;
  categoryNames: string[];
  crystals: string[];
}

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

const GENERIC_TITLES = new Set(
  CATEGORY_TYPE_PRIORITY.map((c) => c.type.toLowerCase())
);

function determineType(categoryNames: string[]) {
  for (const c of CATEGORY_TYPE_PRIORITY) {
    if (categoryNames.some((name) => c.match.test(name))) return c;
  }
  return { type: null as string | null, includeCrystal: true };
}

async function fetchAgg(): Promise<{
  rows: ProductAgg[];
  allCrystals: Set<string>;
}> {
  const base = await db
    .select({ id: products.id, slug: products.slug, title: products.title })
    .from(products);

  const pc = await db
    .select({ productId: productCategories.product_id, name: categories.name })
    .from(productCategories)
    .leftJoin(categories, eq(productCategories.category_id, categories.id));

  const cry = await db
    .select({
      productId: productCrystals.product_id,
      name: productCrystals.name,
    })
    .from(productCrystals);

  const cats = new Map<string, string[]>();
  for (const r of pc) {
    const list = cats.get(r.productId) || [];
    if (r.name) list.push(r.name);
    cats.set(r.productId, list);
  }

  const crystals = new Map<string, string[]>();
  const allCrystals = new Set<string>();
  for (const r of cry) {
    const list = crystals.get(r.productId) || [];
    if (r.name) {
      list.push(r.name);
      allCrystals.add(r.name);
    }
    crystals.set(r.productId, list);
  }

  return {
    rows: base.map((b) => ({
      id: b.id,
      slug: b.slug,
      title: b.title,
      categoryNames: cats.get(b.id) || [],
      crystals: crystals.get(b.id) || [],
    })),
    allCrystals,
  };
}

function isGeneric(p: ProductAgg, allCrystals: Set<string>) {
  const reasons: string[] = [];
  const tinfo = determineType(p.categoryNames);
  const titleLower = p.title.toLowerCase().trim();

  if (!p.title || p.title.trim().length < 4) reasons.push("too short");

  // Title equals a generic type exactly
  if (GENERIC_TITLES.has(titleLower)) reasons.push("generic type only");

  // If crystal should be included but not present in title
  if (tinfo.type && tinfo.includeCrystal) {
    const hasCrystalInTitle =
      p.crystals.some((c) => c && titleLower.includes(c.toLowerCase())) ||
      Array.from(allCrystals).some(
        (c) => c && c.length >= 4 && titleLower.includes(c.toLowerCase())
      );
    if (!hasCrystalInTitle) reasons.push("missing crystal name");
  }

  return reasons;
}

async function main() {
  const { rows, allCrystals } = await fetchAgg();
  const flagged = rows
    .map((p) => ({ p, reasons: isGeneric(p, allCrystals) }))
    .filter((x) => x.reasons.length > 0);

  if (flagged.length === 0) {
    console.log("No generic titles found.");
    return;
  }

  console.log(`Found ${flagged.length} potentially generic title(s):`);
  for (const { p, reasons } of flagged) {
    console.log(`- ${p.slug}: "${p.title}" [${reasons.join(", ")}]`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
