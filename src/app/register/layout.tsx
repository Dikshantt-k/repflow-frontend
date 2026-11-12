import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Start your free trial",
  description: "Create your Repflow 360 account and try gym management software free for 14 days. No card needed.",
  alternates: { canonical: "/register" },
};

export default function Layout({ children }: { children: ReactNode }) {
  return children;
}
