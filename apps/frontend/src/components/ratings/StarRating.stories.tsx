import type { Meta, StoryObj } from "@storybook/react";
import { StarRating } from "./StarRating";

const meta = {
  title: "Ratings/StarRating",
  component: StarRating,
  args: { rating: 4, showNumber: true, reviewCount: 12 },
} satisfies Meta<typeof StarRating>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ReadOnly: Story = {};
export const Interactive: Story = {
  args: { rating: 3, interactive: true, showNumber: true },
};
