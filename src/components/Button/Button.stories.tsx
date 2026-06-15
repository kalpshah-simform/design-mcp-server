import type { Meta, StoryObj } from "@storybook/react";

const meta: Meta = {
  title: "Button",
  component: null as any,
};

export default meta;

export const Primary = () => (
  <button style={{ background: "#0052CC", color: "white" }}>Primary Button</button>
);

export const Secondary = () => (
  <button style={{ background: "#e0e0e0", color: "#333" }}>Secondary Button</button>
);

export const Disabled = () => (
  <button disabled style={{ background: "#ccc", color: "#999" }}>
    Disabled Button
  </button>
);
