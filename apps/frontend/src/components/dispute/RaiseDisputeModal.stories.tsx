import type { Meta, StoryObj } from "@storybook/react";
import { RaiseDisputeModal } from "./RaiseDisputeModal";

const meta = {
  title: "Disputes/RaiseDisputeModal",
  component: RaiseDisputeModal,
  args: {
    contractId: "contract-123",
    engagementId: "engagement-123",
    userWallet: "",
    triggerButton: undefined,
  },
} satisfies Meta<typeof RaiseDisputeModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
  },
};
