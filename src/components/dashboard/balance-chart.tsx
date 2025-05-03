
"use client";

import React from 'react';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig
} from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";

// Mock data specific to this chart component
const chartData = [
  { month: 'Jan', balance: 1000 },
  { month: 'Fév', balance: 1200 },
  { month: 'Mar', balance: 1500 },
  { month: 'Avr', balance: 1400 },
  { month: 'Mai', balance: 1600 },
  { month: 'Juin', balance: 1800 },
  { month: 'Juil', balance: 2000 },
  { month: 'Août', balance: 1900 },
  { month: 'Sep', balance: 2200 },
  { month: 'Oct', balance: 2500 },
];

const chartConfig = {
  balance: {
    label: "Solde",
    color: "hsl(var(--chart-1))",
  },
} satisfies ChartConfig;

export default function BalanceChart() {
  return (
    <ChartContainer config={chartConfig} className="h-[300px] w-full">
      <LineChart data={chartData} margin={{ left: 12, right: 12, top: 5, bottom: 5 }}>
         <CartesianGrid vertical={false} />
         <XAxis
           dataKey="month"
           tickLine={false}
           axisLine={false}
           tickMargin={8}
           fontSize={12}
         />
         <ChartTooltip
           cursor={false}
           content={<ChartTooltipContent indicator="line" nameKey="balance" hideLabel />}
         />
         <Line
           dataKey="balance"
           type="monotone"
           stroke="var(--color-balance)"
           strokeWidth={2}
           dot={false}
         />
       </LineChart>
    </ChartContainer>
  );
}
