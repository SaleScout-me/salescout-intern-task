import type { Product, PriceResult } from "./types";

/**
 * Точность, до которой округляется `best - step` перед floor.
 * Защищает от ошибок двоичной арифметики: например, 8.2 - 0.2 = 7.999999999999999,
 * и без округления floor дал бы 7 вместо 8.
 */
const FLOAT_PRECISION = 1e6;

/**
 * Чистая функция: рассчитывает новую цену для одного товара.
 * Правила — см. README, раздел «Правила расчёта цены».
 * Не меняйте сигнатуру и путь к файлу: решение проверяется автотестами.
 */
export function calculatePrice(product: Product): PriceResult {
  const { sku, myPrice, minPrice, maxPrice, step, competitors } = product;
  const base = { sku, oldPrice: myPrice };

  const inStockPrices = competitors.filter((c) => c.inStock).map((c) => c.price);
  if (inStockPrices.length === 0) {
    return { ...base, newPrice: maxPrice, reason: "NO_COMPETITORS" };
  }

  // reduce вместо Math.min(...arr): spread упирается в лимит аргументов на очень больших списках
  const best = inStockPrices.reduce((min, price) => (price < min ? price : min));
  const candidate = Math.floor(Math.round((best - step) * FLOAT_PRECISION) / FLOAT_PRECISION);

  if (candidate < minPrice) {
    return { ...base, newPrice: minPrice, reason: "AT_MIN" };
  }
  if (candidate > maxPrice) {
    return { ...base, newPrice: maxPrice, reason: "AT_MAX" };
  }
  return { ...base, newPrice: candidate, reason: "UNDERCUT" };
}
