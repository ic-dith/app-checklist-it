import { useState, useRef, useEffect } from "react";
import { Check, Trash2, Edit2, Notebook, X, Save } from "lucide-react";
import { ChecklistItem, SessionTaskState } from "../types";
import { LinkifiedText } from "./LinkifiedText";

interface ChecklistItemRowProps {
  item: ChecklistItem;
  taskState: SessionTaskState;
  onToggleComplete: (id: string) => void;
  onUpdateNote: (id: string, note: string) => void;
  onUpdateDescription: (id: string, desc: string) => void;
  onDeleteTemplateItem: (id: string) => void;
  onEditTemplateItem: (id: string, newText: string) => void;
}

export function ChecklistItemRow({
  item,
  taskState,
  onToggleComplete,
  onUpdateNote,
  onUpdateDescription,
  onDeleteTemplateItem,
  onEditTemplateItem
}: ChecklistItemRowProps) {
  const [isEditingText, setIsEditingText] = useState(false);
  const [editText, setEditText] = useState(item.text);

  const descRef = useRef<HTMLTextAreaElement | null>(null);
  const noteRef = useRef<HTMLTextAreaElement | null>(null);

  const adjustHeight = (textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  };

  useEffect(() => {
    adjustHeight(descRef.current);
  }, [taskState.description]);

  useEffect(() => {
    adjustHeight(noteRef.current);
  }, [taskState.note]);

  useEffect(() => {
    const handleResize = () => {
      adjustHeight(descRef.current);
      adjustHeight(noteRef.current);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleSaveText = () => {
    if (editText.trim() && editText.trim() !== item.text) {
      onEditTemplateItem(item.id, editText.trim());
    }
    setIsEditingText(false);
  };

  const handleCancelText = () => {
    setEditText(item.text);
    setIsEditingText(false);
  };

  return (
    <div
      id={`item-row-${item.id}`}
      className={`group flex flex-col gap-3 p-5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl transition-all hover:shadow-xs ${
        taskState.isCompleted ? "border-slate-200 dark:border-slate-700 bg-slate-50/50" : ""
      }`}
    >
      {/* Top row: Checkbox, Text, Actions */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-4 flex-1 min-w-0">
          {/* Custom Checkbox */}
          <button
            id={`checkbox-${item.id}`}
            type="button"
            onClick={() => onToggleComplete(item.id)}
            className={`mt-1 w-5 h-5 shrink-0 rounded-md border flex items-center justify-center transition-all cursor-pointer ${
              taskState.isCompleted
                ? "bg-indigo-600 border-indigo-600 text-white shadow-xs"
                : "border-slate-350 dark:border-slate-700 hover:border-slate-500 bg-white dark:bg-slate-950 focus:ring-1 focus:ring-indigo-500"
            }`}
            aria-label={`Mark task completed: ${item.text}`}
          >
            {taskState.isCompleted && <Check className="w-3 h-3 stroke-[3.5]" />}
          </button>

          {/* Text Content */}
          <div className="flex-1 min-w-0">
            {isEditingText ? (
              <div className="flex items-center gap-2">
                <input
                  id={`edit-item-input-${item.id}`}
                  type="text"
                  value={editText}
                  onChange={(e) => setEditText(e.target.value)}
                  className="w-full text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-md py-1.5 px-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
                <button
                  onClick={handleSaveText}
                  className="p-1.5 text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                  title="Save edit"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button
                  onClick={handleCancelText}
                  className="p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
                  title="Cancel edit"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <p
                  onClick={() => setIsEditingText(true)}
                  className={`text-base font-medium select-text text-slate-800 dark:text-slate-200 leading-tight cursor-pointer decoration-2 transition-all hover:text-slate-950 dark:hover:text-white ${
                    taskState.isCompleted ? "line-through text-slate-400! dark:text-slate-550!" : ""
                  }`}
                >
                  {item.text}
                </p>
                <div className="flex flex-wrap gap-1.5 items-center">
                  <span className="inline-flex text-[9px] uppercase tracking-wider font-bold items-center px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                    {item.category}
                  </span>
                  {taskState.isCompleted && taskState.checkedBy && (
                    <span className="inline-flex text-[9px] uppercase tracking-wider font-bold items-center px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-650 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/40">
                      ✓ Checked by: {taskState.checkedBy}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Action icons */}
        <div className="flex items-center gap-1 shrink-0 opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity">
          {!isEditingText && (
            <button
              id={`edit-btn-${item.id}`}
              type="button"
              onClick={() => setIsEditingText(true)}
              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors cursor-pointer"
              title="Edit original task text"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            id={`delete-btn-${item.id}`}
            type="button"
            onClick={() => onDeleteTemplateItem(item.id)}
            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-md transition-colors cursor-pointer"
            title="Delete from template folder"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Inputs Section */}
      <div className="pl-9 grid grid-cols-1 md:grid-cols-2 gap-4 mt-1">
        {/* Descrizione (Salvataggio automatico) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`desc-input-${item.id}`} className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400 block font-bold">
            Description
          </label>
          <textarea
            id={`desc-input-${item.id}`}
            ref={descRef}
            value={taskState.description || ""}
            onChange={(e) => onUpdateDescription(item.id, e.target.value)}
            placeholder="description"
            rows={1}
            className="w-full min-h-[44px] py-2 px-3 bg-emerald-50/10 dark:bg-emerald-950/5 border border-emerald-100 dark:border-emerald-900/40 rounded text-sm text-slate-755 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-emerald-400 dark:focus:ring-emerald-700 resize-none overflow-hidden placeholder-slate-400"
          />
          {taskState.description && (/(https?:\/\/[^\s]+)/gi.test(taskState.description) || taskState.description.includes("\\\\")) && (
            <div className="text-[11px] text-emerald-700 dark:text-emerald-400 bg-emerald-50/40 dark:bg-emerald-950/20 px-2 py-1 rounded border border-emerald-150/40 mt-1 break-words">
              <span className="font-semibold">🌐 Interactive link/path: </span>
              <LinkifiedText text={taskState.description} />
            </div>
          )}
        </div>

        {/* Note temporanee (Non salvate) */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor={`note-input-${item.id}`} className="text-[10px] uppercase font-bold tracking-wider text-slate-400 block font-bold">
            Note
          </label>
          <div className="relative">
            <textarea
              id={`note-input-${item.id}`}
              ref={noteRef}
              value={taskState.note || ""}
              onChange={(e) => onUpdateNote(item.id, e.target.value)}
              placeholder="notes"
              rows={1}
              className="w-full min-h-[44px] py-2 px-3 bg-slate-50 dark:bg-slate-950/15 border border-slate-200 dark:border-slate-850 rounded text-sm text-slate-755 dark:text-slate-300 focus:outline-none focus:ring-1 focus:ring-slate-350 dark:focus:ring-slate-750 resize-none overflow-hidden placeholder-slate-400"
            />
          </div>
          {taskState.note && (/(https?:\/\/[^\s]+)/gi.test(taskState.note) || taskState.note.includes("\\\\")) && (
            <div className="text-[11px] text-slate-600 dark:text-slate-400 bg-slate-100/40 dark:bg-slate-900/20 px-2 py-1 rounded border border-slate-200/40 mt-1 break-words">
              <span className="font-semibold">🌐 Interactive link/path: </span>
              <LinkifiedText text={taskState.note} />
            </div>
          )}
          
          {/* Helper quick tags for notes */}
          <div className="flex flex-wrap gap-1">
            {["Checked / OK", "Errors found", "Pending review"].map((tag) => (
              <button
                id={`quicknote-${item.id}-${tag.replace(/\s+/g, '')}`}
                key={tag}
                type="button"
                onClick={() => {
                  const current = (taskState.note || "").trim();
                  const updated = current ? `${current}. ${tag}` : tag;
                  onUpdateNote(item.id, updated);
                }}
                className="text-[10px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 px-2 py-0.5 rounded transition-colors cursor-pointer"
              >
                + {tag}
              </button>
            ))}
            {taskState.note && (
              <button
                id={`clearnote-${item.id}`}
                type="button"
                onClick={() => onUpdateNote(item.id, "")}
                className="text-[10px] text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-950/60 border border-red-200 dark:border-red-900/40 px-2 py-0.5 rounded transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
