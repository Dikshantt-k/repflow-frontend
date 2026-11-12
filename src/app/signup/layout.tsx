import type { Metadata } from "next";
import type { ReactNode } from "react";

// The wizard is reached from a one-time sign-up link: keep it out of search results.
export const metadata: Metadata = {
  title: "Set up your gym",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
