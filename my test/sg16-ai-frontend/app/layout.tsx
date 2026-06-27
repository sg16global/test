import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SG16 AI - Most Powerful AI Engine",
  description: "The most powerful AI platform with privacy-first approach",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="bg-sg16-dark text-white antialiased">
        {children}
      </body>
    </html>
  );
}
