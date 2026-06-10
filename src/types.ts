export interface ChecklistItem {
  id: string;
  text: string;
  category: string;
  createdAt: number;
  description?: string;
}

export interface SessionTaskState {
  itemId: string;
  isCompleted: boolean;
  description: string; // Saved persistently to localStorage
  note: string; // Transient in-memory only
  checkedBy?: string;
  status?: "ok" | "warning" | "error";
}

export interface ChecklistReport {
  id: string;
  title: string;
  timestamp: number;
  totalTasks: number;
  completedTasks: number;
  items: Array<{
    text: string;
    category: string;
    isCompleted: boolean;
    note: string;
  }>;
}
