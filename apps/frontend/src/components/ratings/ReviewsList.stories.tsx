import type { Meta, StoryObj } from "@storybook/react";
import { ReviewsList } from "./ReviewsList";

const meta = {
  title: "Ratings/ReviewsList",
  component: ReviewsList,
} satisfies Meta<typeof ReviewsList>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithReviews: Story = {};
export const Empty: Story = {
  args: { reviews: [], emptyMessage: "No reviews yet." },
};
