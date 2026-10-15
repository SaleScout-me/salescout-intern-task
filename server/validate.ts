import type { Competitor, Product } from "../src/types";

export type ValidationResult =
  | { ok: true; products: Product[] }
  | { ok: false; errors: string[] };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

function isNonNegativeInteger(value: unknown): value is number {
  return isNonNegativeNumber(value) && Number.isInteger(value);
}

function validateCompetitor(value: unknown, path: string, errors: string[]): value is Competitor {
  if (!isRecord(value)) {
    errors.push(`${path}: must be an object`);
    return false;
  }
  const before = errors.length;
  if (typeof value.seller !== "string") errors.push(`${path}.seller: must be a string`);
  if (!isNonNegativeNumber(value.price)) errors.push(`${path}.price: must be a non-negative number`);
  if (typeof value.inStock !== "boolean") errors.push(`${path}.inStock: must be a boolean`);
  return errors.length === before;
}

function validateProduct(value: unknown, path: string, errors: string[]): value is Product {
  if (!isRecord(value)) {
    errors.push(`${path}: must be an object`);
    return false;
  }
  const before = errors.length;

  if (typeof value.sku !== "string" || value.sku === "") errors.push(`${path}.sku: must be a non-empty string`);
  if (typeof value.name !== "string") errors.push(`${path}.name: must be a string`);
  if (!isNonNegativeNumber(value.myPrice)) errors.push(`${path}.myPrice: must be a non-negative number`);
  if (!isNonNegativeInteger(value.minPrice)) errors.push(`${path}.minPrice: must be a non-negative integer`);
  if (!isNonNegativeInteger(value.maxPrice)) errors.push(`${path}.maxPrice: must be a non-negative integer`);
  if (!isNonNegativeNumber(value.step)) errors.push(`${path}.step: must be a non-negative number`);

  if (
    isNonNegativeInteger(value.minPrice) &&
    isNonNegativeInteger(value.maxPrice) &&
    value.minPrice > value.maxPrice
  ) {
    errors.push(`${path}: minPrice must be <= maxPrice`);
  }

  if (!Array.isArray(value.competitors)) {
    errors.push(`${path}.competitors: must be an array`);
  } else {
    value.competitors.forEach((c, i) => validateCompetitor(c, `${path}.competitors[${i}]`, errors));
  }

  return errors.length === before;
}

/** Проверяет тело запроса POST /reprice: массив товаров по контракту из src/types.ts. */
export function validateProducts(body: unknown): ValidationResult {
  if (!Array.isArray(body)) {
    return { ok: false, errors: ["body: must be an array of products"] };
  }
  const errors: string[] = [];
  body.forEach((item, i) => validateProduct(item, `[${i}]`, errors));
  return errors.length === 0 ? { ok: true, products: body as Product[] } : { ok: false, errors };
}
