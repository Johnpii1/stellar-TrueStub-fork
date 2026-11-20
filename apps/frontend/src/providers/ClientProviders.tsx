"use client";

import { ApolloClientProvider } from "@/providers/ApolloProviderWrapper";
import { AuthTokenRefreshProvider } from "@/providers/AuthTokenRefreshProvider";
import { QueryProvider } from "@/providers/QueryProvider";
import { TrustlessWorkProvider } from "@/providers/TrustlessWorkProvider";
import { WalletProvider } from "@/components/tw-blocks/wallet-kit/WalletProvider";
import { BackendHealthBanner } from "@/components/system/BackendHealthBanner";
import { useEffect } from "react";
import { applyDetectedLanguage } from "@/i18n/config";

export function ClientProviders({ children }: { children: React.ReactNode }) {
  // Apply the saved/browser language only after hydration, so the first
  // client render matches the server-rendered default language (#259).
  useEffect(() => {
    void applyDetectedLanguage();
  }, []);

  return (
    <AuthTokenRefreshProvider>
      <ApolloClientProvider>
        <QueryProvider>
          <WalletProvider>
            <TrustlessWorkProvider>
              <BackendHealthBanner />
              {children}
            </TrustlessWorkProvider>
          </WalletProvider>
        </QueryProvider>
      </ApolloClientProvider>
    </AuthTokenRefreshProvider>
  );
}