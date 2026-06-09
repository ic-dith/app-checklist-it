import React, { useState } from "react";
import { Plus, Tag } from "lucide-react";
import { DEFAULT_CATEGORIES } from "../data";

interface AddItemFormProps {
  onAddItem: (text: string, category: string) => void;
  categories?: string[];
}

export function AddItemForm({ onAddItem, categories = DEFAULT_CATEGORIES }: AddItemFormProps) {
  const [text, setText] = useState("");
  const [category, setCategory] = useState(categories[0] || "General");
  const [customCategory, setCustomCategory] = useState("");
  const [showCustomCat, setShowCustomCat] = useState(false);

  // Keep selected category option in sync with prop changes
  React.useEffect(() => {
    if (categories.length > 0 && !categories.includes(category)) {
      setCategory(categories[0]);
    }
  }, [categories]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;

    const finalCategory = showCustomCat && customCategory.trim() 
      ? customCategory.trim() 
      : category;

    onAddItem(text.trim(), finalCategory);
    setText("");
    setCustomCategory("");
    setShowCustomCat(false);
  };

  return (
    <form 
      id="add-item-form"
      onSubmit={handleSubmit} 
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs transition-all"
    >
      <div className="flex flex-col gap-4">
        <div>
          <h3 className="text-slate-900 dark:text-slate-100 font-display font-semibold text-sm mb-1">Add Checklist Template Item</h3>
          <p className="text-slate-500 text-xs text-balance">
            Create items that will be saved permanently. You can then mark them complete and type session-only notes.
          </p>
        </div>

        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1">
            <label htmlFor="task-text-input" className="sr-only">Task description</label>
            <input
              id="task-text-input"
              type="text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="e.g., Run backup scripts, Water the plants..."
              className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400"
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row gap-2 md:w-80">
            {!showCustomCat ? (
              <div className="flex-1 relative">
                <label htmlFor="category-select" className="sr-only">Select Category</label>
                <select
                  id="category-select"
                  value={category}
                  onChange={(e) => {
                    if (e.target.value === "__custom__") {
                      setShowCustomCat(true);
                    } else {
                      setCategory(e.target.value);
                    }
                  }}
                  className="w-full h-10 pl-3 pr-8 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 appearance-none pointer-events-auto"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="__custom__">+ Add Custom Category...</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                  <Tag className="w-4 h-4" />
                </div>
              </div>
            ) : (
              <div className="flex-1 relative flex gap-1">
                <input
                  id="custom-category-input"
                  type="text"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  placeholder="Category Name"
                  className="w-full h-10 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 placeholder-slate-400"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowCustomCat(false)}
                  className="px-2 text-xs text-slate-400 hover:text-slate-600 self-center h-full cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}

            <button
              id="add-item-submit-btn"
              type="submit"
              className="h-10 px-4 shrink-0 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:shadow-xs active:scale-[0.98]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Task</span>
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}
