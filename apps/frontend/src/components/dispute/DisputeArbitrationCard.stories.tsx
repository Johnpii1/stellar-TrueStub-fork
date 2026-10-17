import type { Meta, StoryObj } from "@storybook/react";
import { DisputeArbitrationCard } from "./DisputeArbitrationCard";

const meta = {
  title: "Disputes/DisputeArbitrationCard",
  component: DisputeArbitrationCard,
  args: {
    contractId: "contract-123",
    engagementId: "engagement-123",
    disputeReason: "Ticket was not delivered",
    disputeDescription: "The seller did not transfer the ticket before the agreed deadline.",
    status: "under_review",
  },
} satisfies Meta<typeof DisputeArbitrationCard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const UnderReview: Story = {};
export const OpenWithActions: Story = {
  args: {
    status: "open",
    onEscalate: async () => undefined,
    onResolve: async () => undefined,
    onWithdraw: async () => undefined,
  },
};
export const Resolved: Story = { args: { status: "resolved" } };
