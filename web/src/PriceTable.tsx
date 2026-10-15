import type { PriceResult, Product, Reason } from "../../src/types";

const REASON_LABELS: Record<Reason, string> = {
  UNDERCUT: "Дешевле конкурента",
  AT_MIN: "Упёрлись в минимум",
  AT_MAX: "Упёрлись в максимум",
  NO_COMPETITORS: "Нет конкурентов",
};

const priceFormat = new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 });

function formatPrice(value: number): string {
  return `${priceFormat.format(value)} ₸`;
}

interface Props {
  products: Product[];
  results: PriceResult[];
}

export function PriceTable({ products, results }: Props) {
  const namesBySku = new Map(products.map((p) => [p.sku, p.name]));

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>SKU</th>
            <th>Название</th>
            <th className="num">Было</th>
            <th className="num">Стало</th>
            <th className="num">Разница</th>
            <th>Причина</th>
          </tr>
        </thead>
        <tbody>
          {results.map((r) => {
            const diff = r.newPrice - r.oldPrice;
            const diffClass = diff < 0 ? "down" : diff > 0 ? "up" : "";
            return (
              <tr key={r.sku}>
                <td className="sku">{r.sku}</td>
                <td>{namesBySku.get(r.sku) ?? "—"}</td>
                <td className="num">{formatPrice(r.oldPrice)}</td>
                <td className="num strong">{formatPrice(r.newPrice)}</td>
                <td className={`num ${diffClass}`}>
                  {diff > 0 ? "+" : ""}
                  {priceFormat.format(diff)}
                </td>
                <td>
                  <span className={`badge badge-${r.reason.toLowerCase()}`} title={r.reason}>
                    {REASON_LABELS[r.reason]}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
