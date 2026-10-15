import express, { type ErrorRequestHandler } from "express";
import { calculatePrice } from "../src/pricing";
import type { PriceResult } from "../src/types";
import { validateProducts } from "./validate";

export function createApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.post("/reprice", (req, res) => {
    const result = validateProducts(req.body);
    if (!result.ok) {
      res.status(400).json({ error: "Invalid request body", details: result.errors });
      return;
    }
    const prices: PriceResult[] = result.products.map(calculatePrice);
    res.json(prices);
  });

  // Битый JSON и слишком большое тело: отвечаем JSON-ом, а не HTML-страницей Express
  const handleError: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
    const status = getClientErrorStatus(err);
    if (status === undefined) {
      console.error(err);
      res.status(500).json({ error: "Internal server error" });
      return;
    }
    res.status(status).json({ error: err instanceof Error ? err.message : "Bad request" });
  };
  app.use(handleError);

  return app;
}

/** Статус 4xx, который body-parser проставляет в ошибку (400 — битый JSON, 413 — большое тело). */
function getClientErrorStatus(err: unknown): number | undefined {
  if (typeof err !== "object" || err === null || !("status" in err)) return undefined;
  const { status } = err;
  return typeof status === "number" && status >= 400 && status < 500 ? status : undefined;
}
