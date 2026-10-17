"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { Download, Trash2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { fetchMockEscrows } from "@/lib/mockData";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

// Escrows in any of these statuses are still "in flight" and must resolve
// (complete or get cancelled) before the account can be deleted.
const ACTIVE_ESCROW_STATUSES = [
  "pending",
  "funded",
  "transfer_confirmed",
  "transfer_finalized",
];
const DELETE_CONFIRMATION_PHRASE = "DELETE";

export function PrivacyDataSection() {
  const { t } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isCheckingEscrows, setIsCheckingEscrows] = useState(false);
  const [blockingEscrowCount, setBlockingEscrowCount] = useState<number | null>(null);
  const [confirmationText, setConfirmationText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleExport() {
    setIsExporting(true);
    try {
      const escrows = await fetchMockEscrows();
      const exportPayload = {
        exportedAt: new Date().toISOString(),
        profile: {
          uid: auth.currentUser?.uid ?? null,
          email: auth.currentUser?.email ?? null,
        },
        escrows,
      };

      const blob = new Blob([JSON.stringify(exportPayload, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `truestub-data-export-${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);

      toast.success(t("privacy.exportSuccess"));
    } catch (error) {
      console.error("Failed to export account data:", error);
      toast.error(t("privacy.exportError"));
    } finally {
      setIsExporting(false);
    }
  }

  async function handleOpenDelete() {
    setIsDeleteOpen(true);
    setConfirmationText("");
    setIsCheckingEscrows(true);
    try {
      const escrows = await fetchMockEscrows();
      const activeCount = escrows.filter((escrow) =>
        ACTIVE_ESCROW_STATUSES.includes(escrow.status)
      ).length;
      setBlockingEscrowCount(activeCount);
    } catch (error) {
      console.error("Failed to check active escrows before deletion:", error);
      // Fail closed: block deletion if escrow state can't be confirmed.
      setBlockingEscrowCount(1);
    } finally {
      setIsCheckingEscrows(false);
    }
  }

  async function handleConfirmDelete() {
    if (confirmationText !== DELETE_CONFIRMATION_PHRASE) return;

    setIsDeleting(true);
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error("No signed-in user to delete");
      }

      // Get a fresh ID token to authenticate the backend call.
      const idToken = await user.getIdToken();

      // Step 1: delete/anonymize the user's row and related records in Hasura
      // via the backend endpoint (which holds the admin-secret). This must
      // succeed before we remove the Firebase Auth account — if it fails, the
      // user can retry. The backend also calls firebaseAuth.deleteUser() as
      // its final step, so a single call covers both operations.
      const response = await fetch("/api/users/me", {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Failed to delete account data");
      }

      toast.success(t("privacy.deleteSuccess"));
      setIsDeleteOpen(false);
      window.location.href = "/login";
    } catch (error) {
      console.error("Failed to delete account:", error);
      const code = (error as { code?: string })?.code;
      if (code === "auth/requires-recent-login") {
        toast.error(t("privacy.recentLogin"));
      } else {
        toast.error(t("privacy.deleteError"));
      }
    } finally {
      setIsDeleting(false);
    }
  }

  const hasBlockingEscrows = (blockingEscrowCount ?? 0) > 0;

  return (
    <div>
      <h3 className="text-sm font-semibold mb-3">{t("privacy.title")}</h3>
      <div className="border rounded-lg p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">{t("privacy.exportTitle")}</p>
            <p className="text-xs text-muted-foreground">
              {t("privacy.exportDescription")}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={isExporting}>
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? t("privacy.exportPreparing") : t("privacy.exportButton")}
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t">
          <div>
            <p className="text-sm font-medium text-destructive">{t("privacy.deleteTitle")}</p>
            <p className="text-xs text-muted-foreground">
              {t("privacy.deleteDescription")}
            </p>
          </div>
          <Button variant="destructive" size="sm" onClick={handleOpenDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            {t("privacy.deleteTitle")}
          </Button>
        </div>
      </div>

      <Dialog
        open={isDeleteOpen}
        onOpenChange={(open) => {
          // Do not let the dialog disappear while the irreversible request is in flight.
          if (!open && isDeleting) return;
          setIsDeleteOpen(open);
          if (!open) setConfirmationText("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete account</DialogTitle>
            <DialogDescription id="delete-confirmation-help">
              {isCheckingEscrows
                ? t("privacy.checking")
                : hasBlockingEscrows
                ? t("privacy.blocked")
                : t("privacy.deleteWarning", { phrase: DELETE_CONFIRMATION_PHRASE })}
            </DialogDescription>
          </DialogHeader>

          {!isCheckingEscrows && !hasBlockingEscrows && (
            <div className="space-y-1.5">
              <Label htmlFor="delete-confirmation">{t("privacy.confirmation")}</Label>
              <Input
                id="delete-confirmation"
                value={confirmationText}
                onChange={(e) => setConfirmationText(e.target.value)}
                placeholder={DELETE_CONFIRMATION_PHRASE}
                autoComplete="off"
                autoFocus
                aria-describedby="delete-confirmation-help"
              />
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setIsDeleteOpen(false)}>
              Cancel
            </Button>
            {!hasBlockingEscrows && (
              <Button
                type="button"
                variant="destructive"
                disabled={
                  isCheckingEscrows ||
                  isDeleting ||
                  confirmationText !== DELETE_CONFIRMATION_PHRASE
                }
                onClick={handleConfirmDelete}
              >
                {isDeleting ? t("privacy.deleting") : t("privacy.deleteTitle")}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
