import type { Meta, StoryObj } from "@storybook/react";
import { RatingReviewModal } from "./RatingReviewModal";

const meta = {
  title: "Ratings/RatingReviewModal",
  component: RatingReviewModal,
  args: {
    escrowId: "escrow-123",
    reviewerId: "user-buyer",
    reviewerName: "Alex Buyer",
    revieweeId: "user-seller",
    revieweeName: "Sam Seller",
    role: "buyer",
    triggerButton: undefined,
  },
} satisfies Meta<typeof RatingReviewModal>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Closed: Story = {};
export const Open: Story = {
  play: async ({ canvas, userEvent }) => {
    await userEvent.click(canvas.getByRole("button"));
  },
};
