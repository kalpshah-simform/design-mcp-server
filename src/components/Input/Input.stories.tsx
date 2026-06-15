import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Input",
  component: null as any,
};

export default meta;

export const Text = () => <input type="text" placeholder="Enter text..." />;

export const Email = () => <input type="email" placeholder="Enter email..." />;

export const Password = () => <input type="password" placeholder="Enter password..." />;

export const Disabled = () => <input type="text" placeholder="Disabled input" disabled />;
