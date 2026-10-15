import { useCallback, useEffect, useState } from "react";
import type { PriceResult, Product } from "../../src/types";
import sampleProducts from "../../data/products.json";
import { repriceProducts } from "./api";
import { PriceTable } from "./PriceTable";

const SAMPLE_JSON = JSON.stringify(sampleProducts, null, 2);

type State =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "done"; products: Product[]; results: PriceResult[] };

export function App() {
  const [input, setInput] = useState(SAMPLE_JSON);
  const [state, setState] = useState<State>({ status: "loading" });

  const reprice = useCallback(async (json: string, signal?: AbortSignal) => {
    let products: Product[];
    try {
      products = JSON.parse(json) as Product[];
    } catch {
      setState({ status: "error", message: "Входные данные — некорректный JSON" });
      return;
    }

    setState({ status: "loading" });
    try {
      const results = await repriceProducts(products, signal);
      setState({ status: "done", products, results });
    } catch (err) {
      if (signal?.aborted) return;
      const message = err instanceof Error ? err.message : String(err);
      setState({ status: "error", message: `Не удалось пересчитать цены: ${message}` });
    }
  }, []);

  // Первый расчёт на тестовых данных сразу при открытии страницы
  useEffect(() => {
    const controller = new AbortController();
    void reprice(SAMPLE_JSON, controller.signal);
    return () => controller.abort();
  }, [reprice]);

  return (
    <main>
      <header>
        <h1>SaleScout — прайс-бот</h1>
        <p className="muted">Цены до и после пересчёта через POST /reprice</p>
      </header>

      {state.status === "loading" && <p className="muted">Считаем…</p>}
      {state.status === "error" && <pre className="error">{state.message}</pre>}
      {state.status === "done" && <PriceTable products={state.products} results={state.results} />}

      <details className="editor">
        <summary>Входные данные (JSON)</summary>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          spellCheck={false}
          rows={16}
        />
        <div className="actions">
          <button onClick={() => void reprice(input)} disabled={state.status === "loading"}>
            Пересчитать
          </button>
          <button className="secondary" onClick={() => setInput(SAMPLE_JSON)}>
            Сбросить к примеру
          </button>
        </div>
      </details>
    </main>
  );
}
