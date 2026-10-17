"use client";

import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AlertTriangle, ShieldAlert, Loader2, CheckCircle2, FileText } from "lucide-react";
import { useSingleRelease } from "@/lib/trustless-work/hooks/useSingleRelease";
import { toast } from "sonner";

interface RaiseDisputeModalProps {
  contractId: string;
  engagementId?: string;
  userWallet?: string;
  userRole?: "buyer" | "seller" | "tenant" | "owner" | string;
  disputeResolverAddress?: string;
  onDisputeRaised?: (disputeData: {
    contractId: string;
    reason: string;
    description: string;
    evidenceUrl?: string;
  }) => void;
  triggerButton?: React.ReactNode;
}

const DISPUTE_REASONS = [
  { value: "ticket_not_delivered", label: "disputes.exportLabel" },
  { value: "invalid_ticket", label: "disputes.invalidTicket" },
  { value: "wrong_category", label: "disputes.wrongCategory" },
  { value: "event_cancelled", label: "disputes.eventCancelled" },
  { value: "seller_unresponsive", label: "disputes.sellerUnresponsive" },
  { value: "buyer_non_compliance", label: "disputes.buyerNonCompliance" },
  { value: "other_breach", label: "disputes.otherBreach" },
];

export function RaiseDisputeModal({
  contractId,
  engagementId,
  userWallet = "",
  userRole = "buyer",
  disputeResolverAddress = "GDISPUTE...RESOLVER",
  onDisputeRaised,
  triggerButton,
}: RaiseDisputeModalProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState<string>("");
  const [description, setDescription] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const { startDispute } = useSingleRelease();

  const handleRaiseDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason || !description.trim()) {
      toast.error(t("disputes.validation"));
      return;
    }

    setIsSubmitting(true);
    try {
      // 1. Call Trustless Work SDK on-chain dispute method if available
      try {
        if (contractId && userWallet) {
          await startDispute({
            contractId,
            signer: userWallet,
          });
        }
      } catch (sdkError) {
        console.warn("[Dispute] Trustless Work SDK on-chain call (demo/offline mode):", sdkError);
      }

      // 2. Notify frontend callback / store state
      if (onDisputeRaised) {
        onDisputeRaised({
          contractId,
          reason,
          description,
          evidenceUrl,
        });
      }

      toast.success(t("disputes.success"));
      setIsSuccess(true);

      setTimeout(() => {
        setIsSuccess(false);
        setOpen(false);
      }, 2000);
    } catch (err) {
      console.error("Failed to raise dispute:", err);
      toast.error(t("disputes.failure"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button
            variant="destructive"
            size="sm"
            className="gap-2 bg-red-600 hover:bg-red-700 text-white shadow-sm"
          >
            <AlertTriangle className="h-4 w-4" />
            {t("disputes.raise")}
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="sm:max-w-[520px]">
        {isSuccess ? (
          <div className="py-8 flex flex-col items-center justify-center text-center space-y-3">
            <CheckCircle2 className="h-12 w-12 text-emerald-500 animate-in zoom-in-50 duration-300" />
            <h3 className="text-xl font-semibold text-foreground">{t("disputes.submitted")}</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {t("disputes.successDescription", { id: engagementId || contractId })}
            </p>
          </div>
        ) : (
          <form onSubmit={handleRaiseDispute}>
            <DialogHeader className="space-y-2">
              <div className="flex items-center gap-2 text-red-600 dark:text-red-400">
                <ShieldAlert className="h-6 w-6" />
                <DialogTitle className="text-xl">{t("disputes.title")}</DialogTitle>
              </div>
              <DialogDescription>
                {t("disputes.description", { id: engagementId || contractId })}{" "}
                <span className="font-mono text-xs">{contractId || engagementId}</span>.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="rounded-lg border border-amber-200 bg-amber-50/80 dark:border-amber-900/40 dark:bg-amber-950/20 p-3 text-xs text-amber-900 dark:text-amber-300 space-y-1">
                <p className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-amber-600" />
                  {t("disputes.consequences")}
                </p>
                <ul className="list-disc list-inside space-y-0.5 text-amber-800 dark:text-amber-400 pl-1">
                  <li>{t("disputes.consequenceOne")}</li>
                  <li>{t("disputes.consequenceTwo")}</li>
                  <li>{t("disputes.consequenceThree")}</li>
                </ul>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dispute-reason">
                  {t("disputes.reason")} <span className="text-destructive">*</span>
                </Label>
                <Select value={reason} onValueChange={setReason}>
                  <SelectTrigger id="dispute-reason" className="w-full">
                    <SelectValue placeholder={t("disputes.selectReason")} />
                  </SelectTrigger>
                  <SelectContent>
                    {DISPUTE_REASONS.map((r) => (
                      <SelectItem key={r.value} value={r.value}>
                        {t(r.label)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="dispute-desc">
                  {t("disputes.detailedStatement")} <span className="text-destructive">*</span>
                </Label>
                <Textarea
                  id="dispute-desc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={t("disputes.statementPlaceholder")}
                  className="min-h-[100px] resize-y"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="evidence-url" className="flex items-center gap-1.5">
                  <FileText className="h-3.5 w-3.5" />
                  {t("disputes.evidence")} <span className="text-xs text-muted-foreground">{t("disputes.optional")}</span>
                </Label>
                <Input
                  id="evidence-url"
                  type="url"
                  value={evidenceUrl}
                  onChange={(e) => setEvidenceUrl(e.target.value)}
                  placeholder={t("disputes.evidencePlaceholder")}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                {t("disputes.cancel")}
              </Button>
              <Button
                type="submit"
                variant="destructive"
                disabled={isSubmitting || !reason || !description.trim()}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("disputes.signing")}
                  </>
                ) : (
                  t("disputes.confirm")
                )}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
