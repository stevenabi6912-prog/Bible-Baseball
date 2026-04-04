import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bible Baseball — Faith Baptist Church of Chelsea",
  description: "A Bible trivia game with baseball mechanics. Test your KJV knowledge!",
  manifest: "/Bible-Baseball/manifest.json",
};

export const viewport: Viewport = {
  themeColor: "#0a1628",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-navy-950 text-white">
        {children}
      </body>
    </html>
  );
}
