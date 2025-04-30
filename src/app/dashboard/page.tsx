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
import { Chart } from '@/components/ui/chart';
import { ScrollArea } from '@/components/ui/scroll-area';

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
  { name: 'Jan', balance: 1000 },
  { name: 'Feb', balance: 1200 },
  { name: 'Mar', balance: 1500 },
  { name: 'Apr', balance: 1400 },
  { name: 'May', balance: 1600 },
  { name: 'Jun', balance: 1800 },
  { name: 'Jul', balance: 2000 },
  { name: 'Aug', balance: 1900 },
  { name: 'Sep', balance: 2200 },
  { name: 'Oct', balance: 2500 },
];

export default function DashboardPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-3xl font-bold mb-2">Dashboard</h1>
      <h2 className="text-xl text-gray-500 mb-8">
        Welcome to your personal dashboard!
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-2">
          <CardHeader>
            <CardTitle>Balance Evolution</CardTitle>
            <CardDescription>
              Your balance evolution in the last 10 month
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <CODE_BLOCK>
            <Chart data={chartData} />
            </CODE_BLOCK>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Latest Transactions</CardTitle>
            <CardDescription>
              Here's a summary of your most recent transactions.
            </CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ScrollArea className="h-[300px]">
            <CODE_BLOCK>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {latestTransactions.map((transaction) => (
                  <TableRow key={transaction.id}>
                    <TableCell>{transaction.date}</TableCell>
                    <TableCell>{transaction.description}</TableCell>
                    <TableCell className="text-right">
                      {transaction.amount}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </CODE_BLOCK>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}