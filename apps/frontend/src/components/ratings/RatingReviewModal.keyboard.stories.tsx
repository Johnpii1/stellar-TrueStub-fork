import { expect, within } from "@storybook/test";
import type { Meta, StoryObj } from "@storybook/react";
import { RatingReviewModal } from "./RatingReviewModal";

const meta = {
  title: "Accessibility/RatingReviewModal keyboard navigation",
  component: RatingReviewModal,
  args: {
    escrowId: "escrow-123",
    reviewerId: "user-buyer",
    reviewerName: "Alex Buyer",
    revieweeId: "user-seller",
    revieweeName: "Sam Seller",
    role: "buyer",
  },
} satisfies Meta<typeof RatingReviewModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const KeyboardOnly: Story = {
  play: async ({ canvas, userEvent }) => {
    const trigger = canvas.getByRole("button");
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
