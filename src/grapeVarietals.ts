const normalizeForLookup = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "");

/** Varietal labels that are blends, styles, or regions — not a single grape. */
const NON_GRAPE_VARIETAL_PATTERNS: RegExp[] = [
  /\bblend\b/,
  /\bmeritage\b/,
  /\btable\s+wine\b/,
  /\bbordeaux\b/,
  /\brh[oô]ne\b/,
  /\bgsm\b/,
  /^red$/,
  /^white$/,
  /^ros[eé]$/,
  /^sparkling$/,
  /^champagne$/,
  /^port$/,
  /^sherry$/,
  /^sake$/
];

const GRAPE_VARIETALS = new Set(
  [
    "aglianico",
    "albariño",
    "albarino",
    "barbera",
    "cabernet franc",
    "cabernet sauvignon",
    "carignan",
    "carmenere",
    "carmenère",
    "chardonnay",
    "chenin blanc",
    "cinsault",
    "corvina",
    "dolcetto",
    "gamay",
    "gewurztraminer",
    "gewürztraminer",
    "glera",
    "grenache",
    "gruner veltliner",
    "grüner veltliner",
    "malbec",
    "marsanne",
    "merlot",
    "monastrell",
    "montepulciano",
    "mourvedre",
    "mourvèdre",
    "muscat",
    "nebbiolo",
    "negroamaro",
    "nero d avola",
    "petit sirah",
    "petite sirah",
    "petite verdot",
    "petit verdot",
    "pinot blanc",
    "pinot grigio",
    "pinot gris",
    "pinot meunier",
    "pinot noir",
    "primitivo",
    "riesling",
    "roussanne",
    "sangiovese",
    "sauvignon blanc",
    "semillon",
    "sémillon",
    "shiraz",
    "syrah",
    "tempranillo",
    "touriga nacional",
    "verdejo",
    "vermentino",
    "viognier",
    "zinfandel",
    "assyrtiko",
    "furmint",
    "grillo",
    "moscato",
    "torrontes",
    "torrontés",
    "trebbiano",
    "verdicchio",
    "xinomavro"
  ].map(normalizeForLookup)
);

export const isSpecificGrapeVarietal = (varietal: string): boolean => {
  const normalized = normalizeForLookup(varietal);
  if (!normalized) {
    return false;
  }
  if (NON_GRAPE_VARIETAL_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return false;
  }
  return GRAPE_VARIETALS.has(normalized);
};
