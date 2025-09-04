import "./globals.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Inter } from "next/font/google";
import React from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "Demand Letter Generator",
  description: "AI-powered legal demand letter generator",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="app-container">{children}</div>
      </body>
    </html>
  );
}
