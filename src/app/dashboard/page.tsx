"use client";

import React from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { CartesianGrid, Line, LineChart, XAxis } from "recharts";
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button'; // Import Button
import Link from 'next/link'; // Import Link
import { Icons } from '@/components/icons'; // Import Icons

interface Transaction {
  id: number;
  date: string;
  description: string;
  amount: number;
}

const latestTransactions: Transaction[] = [
  { id: 1, date: '2023-10-26', description: 'Grocery Shopping', amount: -50 },
  { id: 2, date: '2023-10-25', description: 'Salary', amount: 2000 },
  { id: 3, date: '2023-10-24', description: 'Restaurant', amount: -75 },
  { id: 4, date: '2023-10-24', description: 'Online Purchase', amount: -120 },
  { id: 5, date: '2023-10-23', description: 'Bonus', amount: 500 },
];

const chartData = [
  { month: 'Jan', balance: 1000 },
  { month: 'Feb', balance: 1200 },
  { month: 'Mar', balance: 1500 },
  { month: 'Apr', balance: 1400 },
  { month: 'May', balance: 1600 },
  { month: 'Jun', balance: 1800 },
  { month: 'Jul', balance: 2000 },
  { month: 'Aug', balance: 1900 },
  { month: 'Sep', balance: 2200 },
  { month: 'Oct', balance: 2500 },
];

const chartConfig = {
  balance: {
    label: "Balance",
    color: "hsl(var(--chart-1))",
  },
} satisfies import('@/components/ui/chart').ChartConfig;


export default function DashboardPage() {
  return (
    <div className="container mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-1">Dashboard</h1>
            <h2 className="text-xl text-muted-foreground">
              Welcome back! Here's your financial overview.
            </h2>
          </div>
           <Link href="/" passHref>
              <Button variant="outline">
                  <Icons.home className="mr-2 h-4 w-4" /> Go Home
              </Button>
           </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
            <CardHeader>
                <CardTitle>Current Balance</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">€{chartData[chartData.length - 1].balance.toFixed(2)}</p>
                <p className="text-sm text-green-500">+5% from last month</p> {/* Example change */}
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Total Income</CardTitle>
                 <CardDescription>This Month</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">€2500.00</p> {/* Example data */}
            </CardContent>
        </Card>
         <Card>
            <CardHeader>
                <CardTitle>Total Expenses</CardTitle>
                 <CardDescription>This Month</CardDescription>
            </CardHeader>
            <CardContent>
                <p className="text-3xl font-bold">€-245.00</p> {/* Example data */}
            </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Balance Evolution</CardTitle>
            <CardDescription>
              Your balance evolution over the last 10 months.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
             <ChartContainer config={chartConfig} className="h-[300px] w-full">
                <LineChart data={chartData} margin={{ left: 12, right: 12, top: 5, bottom: 5 }}>
                   <CartesianGrid vertical={false} />
                   <XAxis
                     dataKey="month"
                     tickLine={false}
                     axisLine={false}
                     tickMargin={8}
                     fontSize={12} // Adjusted font size for better fit
                   />
                   <ChartTooltip
                     cursor={false}
                     content={<ChartTooltipContent hideLabel />}
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
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Latest Transactions</CardTitle>
            <CardDescription>
              A summary of your most recent transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0"> {/* Remove padding for full width scroll area */}
            <ScrollArea className="h-[300px] border-t"> {/* Add border top */}
            <Table>
              <TableHeader>
                <TableRow>
                  {/* <TableHead>Date</TableHead> */}
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    {/* <TableCell className="font-medium">{transaction.date}</TableCell> */}
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell className={`text-right font-medium ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {transaction.amount >= 0 ? '+' : ''}€{Math.abs(transaction.amount).toFixed(2)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
