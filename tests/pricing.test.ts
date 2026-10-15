import { describe, expect, it } from "vitest";
import { calculatePrice } from "../src/pricing";
import type { Competitor, Product } from "../src/types";
import products from "../data/products.json";
import expected from "../data/expected.json";

function makeProduct(overrides: Partial<Product> = {}): Product {
  return {
    sku: "SKU-1",
    name: "Test product",
    myPrice: 100000,
    minPrice: 90000,
    maxPrice: 110000,
    step: 10,
    competitors: [],
    ...overrides,
  };
}

function seller(price: number, inStock = true): Competitor {
  return { seller: `Seller-${price}`, price, inStock };
}

describe("calculatePrice", () => {
  describe("reference data", () => {
    it("matches data/expected.json for data/products.json", () => {
      expect((products as Product[]).map(calculatePrice)).toEqual(expected);
    });

    it.each([
      { best: 384990, step: 10, min: 370000, max: 420000, newPrice: 384980, reason: "UNDERCUT" },
      { best: 175000, step: 100, min: 180000, max: 210000, newPrice: 180000, reason: "AT_MIN" },
      { best: 150000, step: 1, min: 100000, max: 125000, newPrice: 125000, reason: "AT_MAX" },
      { best: 349999.9, step: 0.5, min: 330000, max: 380000, newPrice: 349999, reason: "UNDERCUT" },
    ])("README example: best=$best step=$step → $newPrice $reason", ({ best, step, min, max, newPrice, reason }) => {
      const result = calculatePrice(
        makeProduct({ step, minPrice: min, maxPrice: max, competitors: [seller(best)] }),
      );
      expect(result).toMatchObject({ newPrice, reason });
    });
  });

  describe("competitor filtering", () => {
    it("returns maxPrice / NO_COMPETITORS when the list is empty", () => {
      const result = calculatePrice(makeProduct({ competitors: [] }));
      expect(result).toMatchObject({ newPrice: 110000, reason: "NO_COMPETITORS" });
    });

    it("returns maxPrice / NO_COMPETITORS when nobody is in stock", () => {
      const result = calculatePrice(
        makeProduct({ competitors: [seller(95000, false), seller(80000, false)] }),
      );
      expect(result).toMatchObject({ newPrice: 110000, reason: "NO_COMPETITORS" });
    });

    it("ignores out-of-stock competitors even if they are cheaper", () => {
      const result = calculatePrice(
        makeProduct({ competitors: [seller(91000, false), seller(100000)] }),
      );
      expect(result).toMatchObject({ newPrice: 99990, reason: "UNDERCUT" });
    });

    it("uses the minimum price among in-stock competitors regardless of order", () => {
      const result = calculatePrice(
        makeProduct({ competitors: [seller(105000), seller(98000), seller(101000)] }),
      );
      expect(result).toMatchObject({ newPrice: 97990, reason: "UNDERCUT" });
    });

    it("handles several competitors sharing the best price", () => {
      const result = calculatePrice(
        makeProduct({ competitors: [seller(98000), seller(98000)] }),
      );
      expect(result).toMatchObject({ newPrice: 97990, reason: "UNDERCUT" });
    });
  });

  describe("range clamping", () => {
    it("is UNDERCUT when the candidate equals minPrice exactly", () => {
      const result = calculatePrice(makeProduct({ competitors: [seller(90010)] }));
      expect(result).toMatchObject({ newPrice: 90000, reason: "UNDERCUT" });
    });

    it("is UNDERCUT when the candidate equals maxPrice exactly", () => {
      const result = calculatePrice(makeProduct({ competitors: [seller(110010)] }));
      expect(result).toMatchObject({ newPrice: 110000, reason: "UNDERCUT" });
    });

    it("is AT_MIN one tenge below minPrice", () => {
      const result = calculatePrice(makeProduct({ competitors: [seller(90009)] }));
      expect(result).toMatchObject({ newPrice: 90000, reason: "AT_MIN" });
    });

    it("is AT_MAX one tenge above maxPrice", () => {
      const result = calculatePrice(makeProduct({ competitors: [seller(110011)] }));
      expect(result).toMatchObject({ newPrice: 110000, reason: "AT_MAX" });
    });

    it("is AT_MIN when step exceeds the best price (negative candidate)", () => {
      const result = calculatePrice(
        makeProduct({ minPrice: 0, step: 500, competitors: [seller(100)] }),
      );
      expect(result).toMatchObject({ newPrice: 0, reason: "AT_MIN" });
    });

    it("works when minPrice equals maxPrice", () => {
      const product = makeProduct({ minPrice: 100000, maxPrice: 100000 });
      expect(calculatePrice({ ...product, competitors: [seller(100010)] })).toMatchObject({
        newPrice: 100000,
        reason: "UNDERCUT",
      });
      expect(calculatePrice({ ...product, competitors: [seller(90000)] })).toMatchObject({
        newPrice: 100000,
        reason: "AT_MIN",
      });
    });
  });

  describe("rounding", () => {
    it("floors fractional candidates down to whole tenge", () => {
      const result = calculatePrice(makeProduct({ step: 0.1, competitors: [seller(100000)] }));
      expect(result).toMatchObject({ newPrice: 99999, reason: "UNDERCUT" });
    });

    it("allows step = 0 (matches the competitor price)", () => {
      const result = calculatePrice(makeProduct({ step: 0, competitors: [seller(100000)] }));
      expect(result).toMatchObject({ newPrice: 100000, reason: "UNDERCUT" });
    });

    it("floors a fractional best price with step = 0", () => {
      const result = calculatePrice(makeProduct({ step: 0, competitors: [seller(100000.99)] }));
      expect(result).toMatchObject({ newPrice: 100000, reason: "UNDERCUT" });
    });

    it("is not fooled by floating point error (8.2 - 0.2 = 7.999999999999999 in JS)", () => {
      const result = calculatePrice(
        makeProduct({ minPrice: 0, maxPrice: 1000, step: 0.2, competitors: [seller(8.2)] }),
      );
      expect(result).toMatchObject({ newPrice: 8, reason: "UNDERCUT" });
    });

    it("always returns an integer newPrice", () => {
      const result = calculatePrice(makeProduct({ step: 0.75, competitors: [seller(99999.5)] }));
      expect(Number.isInteger(result.newPrice)).toBe(true);
    });
  });

  describe("result shape", () => {
    it("returns sku and oldPrice from the product unchanged", () => {
      const result = calculatePrice(
        makeProduct({ sku: "ABC", myPrice: 12345.67, competitors: [seller(100000)] }),
      );
      expect(result).toEqual({ sku: "ABC", oldPrice: 12345.67, newPrice: 99990, reason: "UNDERCUT" });
    });

    it("does not let myPrice affect the result", () => {
      const competitors = [seller(100000)];
      const low = calculatePrice(makeProduct({ myPrice: 1, competitors }));
      const high = calculatePrice(makeProduct({ myPrice: 999999, competitors }));
      expect(low.newPrice).toBe(high.newPrice);
      expect(low.reason).toBe(high.reason);
    });

    it("does not mutate the input product", () => {
      const product = makeProduct({ competitors: [seller(95000, false), seller(100000)] });
      const snapshot = structuredClone(product);
      calculatePrice(product);
      expect(product).toEqual(snapshot);
    });
  });
});
