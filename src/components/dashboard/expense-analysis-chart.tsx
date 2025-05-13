"use client";

import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';

const chartData = [
  { user: 'Jean D.', Dépenses: 32000 }, // Values multiplied by 100 to show on chart better as cents
  { user: 'Sophie L.', Dépenses: 22000 },
  { user: 'Luc M.', Dépenses: 48000 },
  { user: 'Marie P.', Dépenses: 18000 },
];

const chartConfig = {
  Dépenses: {
    label: 'Dépenses (€)',
    color: 'hsl(var(--primary))',
  },
  user: {
    label: 'Utilisateur',
  }
} satisfies ChartConfig;

export default function ExpenseAnalysisChart() {
  return (
    <ChartContainer config={chartConfig} className="h-[350px] w-full">
      <BarChart 
        accessibilityLayer 
        data={chartData} 
        margin={{ top: 20, right: 0, left: -20, bottom: 5 }}
        layout="vertical"
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey="user"
          type="category"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value}
          className="text-xs"
        />
        <XAxis dataKey="Dépenses" type="number" hide />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel />}
        />
        <Bar dataKey="Dépenses" fill="var(--color-Dépenses)" radius={5}>
            <LabelList
                dataKey="Dépenses"
                position="right"
                offset={8}
                className="fill-foreground text-xs"
                formatter={(value: number) => `${(value / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}`}
            />
        </Bar>
      </BarChart>
    </ChartContainer>
  );
}
