"use client";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

type NotificationPreferenceKey =
  | "offers"
  | "escrowUpdates"
  | "savedListingPriceDrops"
  | "eventReminders";

const PREFERENCE_OPTIONS: {
  key: NotificationPreferenceKey;
  label: string;
  description: string;
}[] = [
  {
    key: "offers",
    label: "notificationPreferences.offers",
    description: "notificationPreferences.offersDescription",
  },
  {
    key: "escrowUpdates",
    label: "notificationPreferences.escrowUpdates",
    description: "notificationPreferences.escrowUpdatesDescription",
  },
  {
    key: "savedListingPriceDrops",
    label: "notificationPreferences.savedListingPriceDrops",
    description: "notificationPreferences.savedListingPriceDropsDescription",
  },
  {
    key: "eventReminders",
    label: "notificationPreferences.eventReminders",
    description: "notificationPreferences.eventRemindersDescription",
  },
];

const DEFAULT_PREFERENCES: Record<NotificationPreferenceKey, boolean> = {
  offers: true,
  escrowUpdates: true,
  savedListingPriceDrops: false,
  eventReminders: true,
};

const GET_NOTIFICATION_PREFERENCES = /* GraphQL */ `
  query GetNotificationPreferences {
    notification_preferences_by_pk {
      offers
      escrowUpdates
      savedListingPriceDrops
      eventReminders
    }
  }
`;

const UPDATE_NOTIFICATION_PREFERENCES = /* GraphQL */ `
  mutation UpdateNotificationPreferences(
    $offers: Boolean!
    $escrowUpdates: Boolean!
    $savedListingPriceDrops: Boolean!
    $eventReminders: Boolean!
  ) {
    update_notification_preferences_by_pk(
      pk_columns: { id: 1 }
      _set: {
        offers: $offers
        escrowUpdates: $escrowUpdates
        savedListingPriceDrops: $savedListingPriceDrops
        eventReminders: $eventReminders
      }
    ) {
      offers
      escrowUpdates
      savedListingPriceDrops
      eventReminders
    }
  }
`;

export function NotificationPreferences() {
  const { t } = useTranslation();
  const [preferences, setPreferences] = useState(DEFAULT_PREFERENCES);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadPreferences() {
      try {
        const response = await fetch("/api/graphql", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: GET_NOTIFICATION_PREFERENCES }),
        });

        if (!response.ok) {
          return;
        }

        const { data } = await response.json();
        const stored = data?.notification_preferences_by_pk;

        if (!cancelled && stored) {
          setPreferences({
            offers: stored.offers ?? DEFAULT_PREFERENCES.offers,
            escrowUpdates:
              stored.escrowUpdates ?? DEFAULT_PREFERENCES.escrowUpdates,
            savedListingPriceDrops:
              stored.savedListingPriceDrops ??
              DEFAULT_PREFERENCES.savedListingPriceDrops,
            eventReminders:
              stored.eventReminders ?? DEFAULT_PREFERENCES.eventReminders,
          });
        }
      } catch {
        // Keep defaults if the stored preferences can't be loaded.
      }
    }

    loadPreferences();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleToggle = (key: NotificationPreferenceKey, checked: boolean) => {
    setPreferences((prev) => ({ ...prev, [key]: checked }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsSaving(true);

    try {
      await fetch("/api/graphql", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          query: UPDATE_NOTIFICATION_PREFERENCES,
          variables: {
            offers: preferences.offers,
            escrowUpdates: preferences.escrowUpdates,
            savedListingPriceDrops: preferences.savedListingPriceDrops,
            eventReminders: preferences.eventReminders,
          },
        }),
      });
    } catch {
      // Keep the optimistic state if the save request fails.
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <h2 className="text-lg font-semibold mb-4">{t("notificationPreferences.title")}</h2>

      <div className="border border-gray-200 dark:border-gray-700 rounded-lg p-6 space-y-5">
        {PREFERENCE_OPTIONS.map(({ key, label, description }) => (
          <div key={key} className="flex items-start gap-3">
            <Checkbox
              id={`notify-${key}`}
              checked={preferences[key]}
              onCheckedChange={(checked) => handleToggle(key, checked === true)}
              className="mt-0.5"
            />
            <div>
              <Label htmlFor={`notify-${key}`} className="font-medium">
                {t(label)}
              </Label>
              <p className="text-sm text-muted-foreground">{t(description)}</p>
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-orange-500 hover:bg-orange-600 text-white"
          >
            {isSaving ? t("notificationPreferences.saving") : t("notificationPreferences.save")}
          </Button>
        </div>
      </div>
    </form>
  );
}
