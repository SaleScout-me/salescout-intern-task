import { describe, expect, it } from "vitest";
import request from "supertest";
import { createApp } from "../server/app";
import { validateProducts } from "../server/validate";
import products from "../data/products.json";
import expected from "../data/expected.json";

const app = createApp();

const validProduct = {
  sku: "SKU-1",
  name: "Test",
  myPrice: 100,
  minPrice: 50,
  maxPrice: 150,
  step: 1,
  competitors: [{ seller: "A", price: 100, inStock: true }],
};

describe("POST /reprice", () => {
  it("returns results for data/products.json in the same order", async () => {
    const res = await request(app).post("/reprice").send(products);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(expected);
  });

  it("returns an empty array for an empty array", async () => {
    const res = await request(app).post("/reprice").send([]);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it.each([
    ["an object", { foo: "bar" }],
    ["a string", "\"products\""],
    ["a number", "42"],
    ["null", "null"],
  ])("returns 400 when the body is %s", async (_label, body) => {
    const res = await request(app)
      .post("/reprice")
      .set("Content-Type", "application/json")
      .send(typeof body === "string" ? body : JSON.stringify(body));
    expect(res.status).toBe(400);
    expect(res.body.error).toBeTypeOf("string");
  });

  it("returns 400 when the body is missing", async () => {
    const res = await request(app).post("/reprice");
    expect(res.status).toBe(400);
  });

  it("returns 400 JSON for malformed JSON", async () => {
    const res = await request(app)
      .post("/reprice")
      .set("Content-Type", "application/json")
      .send("[{oops");
    expect(res.status).toBe(400);
    expect(res.headers["content-type"]).toMatch(/json/);
  });

  it("returns 400 with details when a product is invalid", async () => {
    const res = await request(app)
      .post("/reprice")
      .send([validProduct, { ...validProduct, minPrice: "50" }]);
    expect(res.status).toBe(400);
    expect(res.body.details).toEqual(["[1].minPrice: must be a non-negative integer"]);
  });
});

describe("validateProducts", () => {
  it("accepts a valid list", () => {
    expect(validateProducts([validProduct])).toEqual({ ok: true, products: [validProduct] });
  });

  it.each([
    ["negative price", { minPrice: -1 }, "[0].minPrice: must be a non-negative integer"],
    ["fractional maxPrice", { maxPrice: 1.5 }, "[0].maxPrice: must be a non-negative integer"],
    ["minPrice > maxPrice", { minPrice: 200 }, "[0]: minPrice must be <= maxPrice"],
    ["empty sku", { sku: "" }, "[0].sku: must be a non-empty string"],
    ["non-array competitors", { competitors: null }, "[0].competitors: must be an array"],
    [
      "bad competitor",
      { competitors: [{ seller: "A", price: 1, inStock: "yes" }] },
      "[0].competitors[0].inStock: must be a boolean",
    ],
  ])("rejects %s", (_label, override, error) => {
    const result = validateProducts([{ ...validProduct, ...override }]);
    expect(result).toEqual({ ok: false, errors: [error] });
  });

  it("rejects non-object items", () => {
    expect(validateProducts([null, 1])).toEqual({
      ok: false,
      errors: ["[0]: must be an object", "[1]: must be an object"],
    });
  });
});
