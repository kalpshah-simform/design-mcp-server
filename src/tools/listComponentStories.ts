import { loadComponentStories } from "../loaders/storybookLoader.js";

export async function listComponentStories() {
  return await loadComponentStories();
}
