import type { Metadata } from "next";
import { Inter, Barlow_Condensed } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const barlowCondensed = Barlow_Condensed({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Repflow",
  description: "Run your gym at full pace.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${barlowCondensed.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html:
              'try{var t=localStorage.getItem("repflow-theme");if(t==="light"||t==="dark")document.documentElement.setAttribute("data-theme",t);}catch(e){}',
          }}
        />
      </head>
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
