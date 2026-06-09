import { ChecklistItem } from "./types";

export const DEFAULT_CATEGORIES = [
  "General",
  "Daily Routine",
  "Work & Tech",
  "Health & Wellness",
  "Travel & Packing"
];

export const INITIAL_CHECKLIST_ITEMS: ChecklistItem[] = [
  {
    id: "item-1",
    text: "Review team agenda and align on priorities",
    category: "Work & Tech",
    createdAt: Date.now() - 1000 * 60 * 60 * 2,
  },
  {
    id: "item-2",
    text: "Verify critical server logs and database health indicators",
    category: "Work & Tech",
    createdAt: Date.now() - 1000 * 60 * 60 * 1.5,
  },
  {
    id: "item-3",
    text: "Perform full posture alignment stretch and hydrate (500ml)",
    category: "Health & Wellness",
    createdAt: Date.now() - 1000 * 60 * 60 * 1,
  },
  {
    id: "item-4",
    text: "Clear desktop clutter and organize workspace files",
    category: "Daily Routine",
    createdAt: Date.now() - 1000 * 60 * 60 * 0.5,
  },
  {
    id: "item-5",
    text: "Double-check emergency security keys and backup files",
    category: "General",
    createdAt: Date.now() - 1000 * 60 * 60 * 0.1,
  },
];
