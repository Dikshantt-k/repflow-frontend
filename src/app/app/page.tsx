"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { homeFor } from "@/lib/nav";
import { Spinner } from "@/components/ui";

export default function AppIndexPage() {
  const router = useRouter();
  const { context, loading } = useAuth();

  useEffect(() => {
    if (!loading && context) router.replace(homeFor(context.role));
  }, [loading, context, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <Spinner />
    </div>
  );
}
