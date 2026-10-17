"use client";

import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/chart-utils";
import { summarizeEarnings, type EarningsPeriod, type PayoutEscrow } from "@/lib/earnings";

const PERIODS: { value: EarningsPeriod; labelKey: string }[] = [
  { value: "day", labelKey: "earnings.daily" },
  { value: "week", labelKey: "earnings.weekly" },
  { value: "month", labelKey: "earnings.monthly" },
];

const formatBucketLabel = (key: string, period: EarningsPeriod) =>
  new Date(`${key}T00:00:00Z`).toLocaleDateString("en-US", {
    timeZone: "UTC",
    month: "short",
    ...(period === "month" ? { year: "2-digit" } : { day: "numeric" }),
  });

export function SellerEarnings({ escrows }: { escrows: PayoutEscrow[] }) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState<EarningsPeriod>("month");
  const summary = useMemo(() => summarizeEarnings(escrows, period), [escrows, period]);
  const data = summary.buckets.map((b) => ({ ...b, label: formatBucketLabel(b.key, period) }));

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t("earnings.total")}</p>
          <p className="text-3xl font-bold" data-testid="total-earnings">
            {summary.total.toLocaleString()} USDC
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-sm text-muted-foreground">{t("earnings.sales")}</p>
          <p className="text-3xl font-bold">{summary.count}</p>
        </Card>
      </div>

      <Card className="p-4 space-y-4">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <h2 className="font-semibold">{t("earnings.periods")}</h2>
          <div className="flex gap-1" role="group" aria-label={t("earnings.groupBy")}>
            {PERIODS.map((p) => (
              <Button
                key={p.value}
                size="sm"
                variant={period === p.value ? "default" : "outline"}
                onClick={() => setPeriod(p.value)}
              >
                {t(p.labelKey)}
              </Button>
            ))}
          </div>
        </div>

        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-10">
            {t("earnings.noReleased")}
          </p>
        ) : (
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" />
                <YAxis tickFormatter={(v: number) => formatCurrency(v)} width={70} />
                <Tooltip formatter={(v) => [`${Number(v).toLocaleString()} USDC`, t("earnings.earned")]} />
                <Bar dataKey="total" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </Card>

      <Card className="p-4">
        <h2 className="font-semibold mb-3">{t("earnings.breakdown")}</h2>
        <table className="w-full text-sm">
          <thead className="text-left text-muted-foreground">
            <tr>
              <th className="py-1">{t("earnings.periodStarting")}</th>
              <th className="py-1">{t("earnings.sales")}</th>
              <th className="py-1 text-right">{t("earnings.earned")}</th>
            </tr>
          </thead>
          <tbody>
            {[...summary.buckets].reverse().map((b) => (
              <tr key={b.key} className="border-t">
                <td className="py-1.5">{formatBucketLabel(b.key, period)}</td>
                <td className="py-1.5">{b.count}</td>
                <td className="py-1.5 text-right">{b.total.toLocaleString()} USDC</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
