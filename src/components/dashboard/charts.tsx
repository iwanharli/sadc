"use client"

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts"
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart"

const config = {
  satpam: { label: "Satpam", color: "var(--series-satpam)" },
  dc: { label: "Debt Collector", color: "var(--series-dc)" },
} satisfies ChartConfig

const fmtTgl = (v: string, opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("id-ID", { ...opts, timeZone: "UTC" }).format(new Date(v + "T00:00:00Z"))

/** Pendataan harian per profesi — batang bertumpuk. */
export function TrenChart({ data }: { data: { tgl: string; satpam: number; dc: number }[] }) {
  return (
    <ChartContainer config={config} className="aspect-auto h-[320px] w-full">
      <BarChart data={data} margin={{ left: -12, right: 4, top: 8 }} barCategoryGap="18%">
        <CartesianGrid vertical={false} strokeDasharray="3 3" />
        <XAxis
          dataKey="tgl"
          tickLine={false}
          axisLine={false}
          tickMargin={10}
          minTickGap={28}
          tick={{ fontSize: 13 }}
          tickFormatter={(v) => fmtTgl(v, { day: "numeric", month: "short" })}
        />
        <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 13 }} allowDecimals={false} />
        <ChartTooltip
          cursor={{ fill: "var(--muted)", opacity: 0.6 }}
          content={
            <ChartTooltipContent
              className="min-w-44 text-sm"
              labelFormatter={(v) => fmtTgl(String(v), { weekday: "long", day: "numeric", month: "long" })}
            />
          }
        />
        <ChartLegend content={<ChartLegendContent className="pt-4 text-sm" />} />
        <Bar dataKey="satpam" stackId="a" fill="var(--color-satpam)" stroke="var(--card)" strokeWidth={1} isAnimationActive={false} />
        <Bar dataKey="dc" stackId="a" fill="var(--color-dc)" stroke="var(--card)" strokeWidth={1} isAnimationActive={false} radius={[4, 4, 0, 0]} />
      </BarChart>
    </ChartContainer>
  )
}

/** Peringkat Polda — batang horizontal bertumpuk. */
export function PoldaChart({ data }: { data: { nama: string; satpam: number; dc: number }[] }) {
  const rows = data.map((d) => ({ ...d, nama: d.nama.replace(/^Polda /, "") }))
  return (
    <ChartContainer config={config} className="aspect-auto w-full" style={{ height: rows.length * 40 + 24 }}>
      <BarChart data={rows} layout="vertical" margin={{ left: 0, right: 12 }} barCategoryGap="22%">
        <XAxis type="number" hide />
        <YAxis
          type="category"
          dataKey="nama"
          tickLine={false}
          axisLine={false}
          width={140}
          tick={{ fontSize: 14 }}
        />
        <ChartTooltip cursor={{ fill: "var(--muted)", opacity: 0.6 }} content={<ChartTooltipContent className="min-w-44 text-sm" />} />
        <Bar dataKey="satpam" stackId="a" fill="var(--color-satpam)" stroke="var(--card)" strokeWidth={1} isAnimationActive={false} />
        <Bar dataKey="dc" stackId="a" fill="var(--color-dc)" stroke="var(--card)" strokeWidth={1} isAnimationActive={false} radius={[0, 4, 4, 0]} />
      </BarChart>
    </ChartContainer>
  )
}
