import type { Meta, StoryObj } from "@storybook/react";
import { UserReputationSummary } from "./UserReputationSummary";

const meta = {
  title: "Ratings/UserReputationSummary",
  component: UserReputationSummary,
} satisfies Meta<typeof UserReputationSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Full: Story = {};
export const Compact: Story = { args: { compact: true } };
