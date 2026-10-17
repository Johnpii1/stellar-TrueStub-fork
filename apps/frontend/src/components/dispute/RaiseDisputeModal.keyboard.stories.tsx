import { expect, within } from "@storybook/test";
import type { Meta, StoryObj } from "@storybook/react";
import { RaiseDisputeModal } from "./RaiseDisputeModal";

const meta = {
  title: "Accessibility/RaiseDisputeModal keyboard navigation",
  component: RaiseDisputeModal,
  args: {
    contractId: "contract-123",
    engagementId: "engagement-123",
    userWallet: "",
  },
} satisfies Meta<typeof RaiseDisputeModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const KeyboardOnly: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button", { name: /raise dispute/i });
    await userEvent.click(trigger);

    const dialog = within(document.body).getByRole("dialog");
    await expect(dialog).toBeInTheDocument();

    await userEvent.tab();
    await expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await userEvent.keyboard("{Escape}");
    await expect(within(document.body).queryByRole("dialog")).not.toBeInTheDocument();
    await expect(trigger).toHaveFocus();
  },
};
