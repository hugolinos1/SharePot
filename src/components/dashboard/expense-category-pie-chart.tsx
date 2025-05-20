
"use client";

import React from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Skeleton } from '@/components/ui/skeleton';
import { CardDescription } from '@/components/ui/card';
import { Icons } from '@/components/icons';

interface ExpenseCategoryPieChartProps {
  data: Array<{ category: string; Dépenses: number }> | undefined;
  isLoading: boolean;
}

const COLORS = [
  'hsl(var(--chart-1))', 
  'hsl(var(--chart-2))', 
  'hsl(var(--chart-3))', 
  'hsl(var(--chart-4))', 
  'hsl(var(--chart-5))',
  'hsl(220, 70%, 60%)', // Additional distinct colors
  'hsl(160, 70%, 50%)',
  'hsl(40, 80%, 55%)',
  'hsl(300, 70%, 65%)',
  'hsl(0, 75%, 60%)',
];

const RADIAN = Math.PI / 180;
const renderCustomizedLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percent * 100 < 5) return null; // Don't render label for very small slices

  return (
    <text x={x} y={y} fill="white" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" className="text-xs font-medium">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="p-2 bg-background border border-border rounded-md shadow-lg text-foreground text-sm">
        <p className="font-semibold">{`${payload[0].name}`}</p>
        <p>{`Dépenses: ${(payload[0].value / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })} (${(payload[0].payload.percent * 100).toFixed(1)}%)`}</p>
      </div>
    );
  }
  return null;
};

export default function ExpenseCategoryPieChart({ data, isLoading }: ExpenseCategoryPieChartProps) {
  if (isLoading) {
    return (
      <div className="h-[350px] w-full flex items-center justify-center">
        <Skeleton className="h-full w-full rounded-full" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="h-[350px] w-full flex flex-col items-center justify-center text-center">
        <Icons.pieChart className="h-12 w-12 text-muted-foreground mb-3" /> {/* Changed icon */}
        <p className="text-muted-foreground">Aucune donnée de dépense à afficher pour ce graphique.</p>
        <CardDescription className="mt-1 text-xs">
          Vérifiez qu'il y a des dépenses pour le projet sélectionné ou que les filtres sont corrects.
        </CardDescription>
      </div>
    );
  }
  
  const chartData = data.map(item => ({
    name: item.category,
    value: item.Dépenses, // Dépenses is already in cents
  }));


  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderCustomizedLabel}
          outerRadius={120}
          fill="#8884d8"
          dataKey="value"
          nameKey="name"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend 
          verticalAlign="bottom" 
          wrapperStyle={{paddingTop: "20px"}}
          formatter={(value, entry) => {
            const { color, payload } = entry as any;
            const originalValue = payload?.value / 100; // Convert back from cents
            return <span style={{ color: color, marginRight: '5px' }}>{value} ({originalValue.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })})</span>;
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
