
"use client";

import React from 'react';
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { Skeleton } from '@/components/ui/skeleton';
import { CardDescription } from '@/components/ui/card';
import { Icons } from '@/components/icons';
import { cn } from "@/lib/utils";


const chartConfigBase = {
  Dépenses: {
    label: 'Dépenses (€)',
    color: 'hsl(var(--primary))',
  },
};

interface ExpenseAnalysisChartProps {
  data: Array<{ [key: string]: string | number }> | undefined; 
  isLoading: boolean;
  yAxisDataKey: string; 
}

export default function ExpenseAnalysisChart({ data, isLoading, yAxisDataKey }: ExpenseAnalysisChartProps) {
  
  const chartConfig = {
    ...chartConfigBase,
    [yAxisDataKey]: { 
        label: yAxisDataKey.charAt(0).toUpperCase() + yAxisDataKey.slice(1), 
    },
  } satisfies ChartConfig;

  const customTooltipFormatter = (value: number, name: string, item: any) => {
    // 'name' here will be "Dépenses"
    const itemConfig = chartConfig[name as keyof typeof chartConfig] || chartConfig.Dépenses;
    const indicatorColor = item.payload.fill || item.color || chartConfig.Dépenses.color;

    return (
      <div
        key={item.dataKey || name}
        className={cn(
          "flex w-full items-center flex-wrap gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground"
        )}
      >
        <div
          className={cn(
            "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
             "h-2.5 w-2.5" // Ensure dot indicator style
          )}
          style={
            {
              "--color-bg": indicatorColor,
              "--color-border": indicatorColor,
            } as React.CSSProperties
          }
        />
        <div
          className={cn(
            "flex flex-1 justify-between leading-none",
            "items-center"
          )}
        >
          <span className="text-muted-foreground">
            {itemConfig?.label || name}
          </span>
          <span className="font-mono font-medium tabular-nums text-foreground">
            {(value / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </span>
        </div>
      </div>
    );
  };


  if (isLoading) {
    return (
      <div className="h-[350px] w-full flex items-center justify-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[350px] w-full flex flex-col items-center justify-center text-center">
        <Icons.barChartBig className="h-12 w-12 text-muted-foreground mb-3" />
        <p className="text-muted-foreground">Aucune donnée de dépense à afficher pour ce graphique.</p>
        <CardDescription className="mt-1 text-xs">
          Vérifiez qu'il y a des dépenses pour le projet sélectionné ou que les filtres sont corrects.
        </CardDescription>
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-[350px] w-full">
      <BarChart
        accessibilityLayer
        data={data}
        margin={{ top: 20, right: 0, left: 20, bottom: 5 }} 
        layout="vertical"
      >
        <CartesianGrid horizontal={false} />
        <YAxis
          dataKey={yAxisDataKey} 
          type="category"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => value as string} 
          className="text-xs"
          width={80} 
        />
        <XAxis dataKey="Dépenses" type="number" hide />
        <ChartTooltip
          cursor={false}
          content={<ChartTooltipContent hideLabel formatter={customTooltipFormatter} />}
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
