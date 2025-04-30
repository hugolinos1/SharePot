import Link from 'next/link';

export default function Home() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-2">
      <main className="flex flex-col items-center justify-center w-full flex-1 px-20 text-center">
        <h1 className="text-6xl font-bold">
          Welcome to <span className="text-blue-600">Your App</span>
        </h1>
        <p className="mt-3 text-2xl">
          Get started by editing <code className="p-1 bg-muted rounded"> src/app/page.tsx </code>
        </p>
      </main>
    </div>
  );
}