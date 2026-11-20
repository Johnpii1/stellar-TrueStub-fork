"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL;

/**
 * Checks the backend itself rather than treating a configured URL as proof
 * that the service is available. The banner is intentionally non-blocking.
 */
export function BackendHealthBanner() {
  const [unavailable, setUnavailable] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!BACKEND_URL) {
      setUnavailable(true);
      return;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 5000);

    fetch(`${BACKEND_URL.replace(/\/$/, "")}/health`, {
      method: "GET",
      cache: "no-store",
      signal: controller.signal,
    })
      .then((response) => {
        setUnavailable(!response.ok);
      })
      .catch(() => {
        setUnavailable(true);
      })
      .finally(() => {
        window.clearTimeout(timeout);
      });

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  if (!unavailable || dismissed) return null;

  return (
    <div className="fixed inset-x-4 top-4 z-[100] mx-auto max-w-2xl">
      <Alert variant="destructive" className="flex items-start gap-3 bg-background shadow-lg">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
        <AlertDescription className="flex-1 pr-2">
          <span className="font-semibold">Some features are temporarily unavailable.</span>{" "}
          The TrueStub backend cannot be reached. Escrow actions that do not depend on
          the backend may continue to work.
        </AlertDescription>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          aria-label="Dismiss backend warning"
          onClick={() => setDismissed(true)}
        >
          <X className="h-4 w-4" />
        </Button>
      </Alert>
    </div>
  );
}
