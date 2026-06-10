import { Copy, CheckCircle2, AlertCircle, FileText, Printer, ArrowLeft, RefreshCw } from "lucide-react";
import { ChecklistItem, SessionTaskState } from "../types";
import { useState } from "react";
import { LinkifiedText } from "./LinkifiedText";

interface ReportViewProps {
  items: ChecklistItem[];
  taskStates: Record<string, SessionTaskState>;
  onClose: () => void;
  onResetSession: () => void;
  onShowAlert?: (title: string, message: string) => void;
  appTitle?: string;
  appSubtitle?: string;
  checkerName?: string;
}

export function ReportView({ 
  items, 
  taskStates, 
  onClose, 
  onResetSession, 
  onShowAlert, 
  appTitle, 
  appSubtitle,
  checkerName
}: ReportViewProps) {
  const [copied, setCopied] = useState(false);

  // Math metrics
  const total = items.length;
  const completed = items.filter(item => taskStates[item.id]?.isCompleted).length;
  const percentage = total > 0 ? Math.round((completed / total) * 105) > 100 ? Math.round((completed / total) * 100) : Math.round((completed / total) * 100) : 0;
  
  // Circumference for 42px radius circle = 2 * PI * 42 = 263.89
  const strokeDashoffset = 263.89 - (percentage / 100) * 263.89;

  const itemsWithNotes = items.filter(item => taskStates[item.id]?.note?.trim());
  const formattedDate = new Date().toLocaleDateString("en-US", {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });

  // Grouping items by category
  const categories = Array.from(new Set(items.map(item => item.category)));

  // Generate plain-text Markdown report for copying
  const generateMarkdownReport = () => {
    let report = `## ${appTitle || "Checklist Session Final Report"}\n`;
    report += `${appSubtitle || "Document / Final Session Assessment"}\n`;
    report += `Generated on: ${formattedDate}\n`;
    if (checkerName) {
      report += `Checked by: ${checkerName}\n`;
    }
    report += `Overall Progress: ${percentage}% (${completed}/${total} completed)\n`;
    report += `==============================================\n\n`;

    categories.forEach(cat => {
      const catItems = items.filter(item => item.category === cat);
      if (catItems.length === 0) return;

      report += `### 📁 [Category: ${cat}]\n`;
      catItems.forEach(item => {
        const state = taskStates[item.id];
        const status = state?.isCompleted ? "✔ [DONE] " : "❌ [PENDING] ";
        report += `  - ${status}${item.text}\n`;
        if (state?.description && state.description.trim()) {
          report += `    ↳ 📝 Saved Desc: "${state.description.trim()}"\n`;
        }
        if (state?.note && state.note.trim()) {
          report += `    ↳ 💡 Temp Note: "${state.note.trim()}"\n`;
        }
      });
      report += `\n`;
    });

    return report;
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generateMarkdownReport());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy report", err);
    }
  };

  const getYYYYMMDD = () => {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const rDay = String(d.getDate()).padStart(2, "0");
    return `${y}${m}${rDay}`;
  };

  const downloadPrintableHTML = () => {
    try {
      const pTitle = appTitle || "Checklist Completion Report";
      const pSubtitle = appSubtitle || "Operational Safety Checklist Code Review & Audit";
      const yyyymmdd = getYYYYMMDD();
      const docTitle = `${yyyymmdd} - checklist report`;

      const linkifyHTML = (text: string): string => {
        if (!text) return "";
        const urlRegex = /(https?:\/\/[^\s<>""'']+)/gi;
        return text.replace(urlRegex, (url) => {
          return `<a href="${url}" target="_blank" rel="noopener noreferrer" style="color: #4f46e5; text-decoration: underline; word-break: break-all;">${url}</a>`;
        });
      };

      let tableHTML = "";
      categories.forEach(cat => {
        const catItems = items.filter(item => item.category === cat);
        if (catItems.length === 0) return;

        tableHTML += `
          <div class="category-section" style="margin-bottom: 25px; page-break-inside: avoid;">
            <div class="category-header" style="display: flex; align-items: center; gap: 8px; margin-bottom: 12px;">
              <span class="category-bullet" style="width: 8px; height: 8px; border-radius: 50%; background-color: #4f46e5; display: inline-block;"></span>
              <h3 style="font-size: 11px; text-transform: uppercase; font-weight: 800; letter-spacing: 0.1em; color: #1e293b; margin: 0;">${cat}</h3>
            </div>
            <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background-color: #ffffff;">
              <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
                <table style="width: 100%; min-width: 650px; border-collapse: collapse; font-size: 13px; table-layout: fixed;">
                <thead>
                  <tr style="background-color: #f8fafc; border-bottom: 1px solid #e2e8f0;">
                    <th style="width: 18%; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; color: #64748b; padding: 12px 16px;">Status</th>
                    <th style="width: 37%; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; color: #64748b; padding: 12px 16px;">Checkpoint Description</th>
                    <th style="width: 25%; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; color: #64748b; padding: 12px 16px;">Description</th>
                    <th style="width: 20%; text-align: left; font-weight: 600; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; color: #64748b; padding: 12px 16px;">Notes</th>
                  </tr>
                </thead>
                <tbody>
        `;

        catItems.forEach(item => {
          const state = taskStates[item.id];
          const isComp = state?.isCompleted;
          const desc = state?.description && state.description.trim() ? linkifyHTML(state.description.trim()) : "";
          const note = state?.note && state.note.trim() ? linkifyHTML(state.note.trim()) : "";
          const statusText = isComp 
            ? `<span style="color: #4f46e5; font-weight: 700;">✔ DONE</span>` 
            : `<span style="color: #94a3b8; font-weight: 700;">— PENDING</span>`;
          
          tableHTML += `
            <tr style="border-bottom: 1px solid #e2e8f0;">
              <td style="padding: 12px 16px; font-family: monospace; font-size: 11px; word-break: break-word; overflow-wrap: break-word; vertical-align: top;">${statusText}</td>
              <td class="${isComp ? 'line-through' : ''}" style="padding: 12px 16px; font-weight: 500; color: #334155; word-break: break-word; overflow-wrap: break-word; vertical-align: top; ${isComp ? 'text-decoration: line-through; color: #94a3b8;' : ''}">${item.text}</td>
              <td style="padding: 12px 16px; font-style: italic; color: #334155; word-break: break-word; overflow-wrap: break-word; vertical-align: top;">
                ${desc ? `<span style="display: block; background-color: #f0fdf4; border: 1px solid #dcfce7; color: #166534; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-family: sans-serif; font-style: normal; word-break: break-word; overflow-wrap: break-word;">${desc}</span>` : `<span style="color: #cbd5e1;">—</span>`}
              </td>
              <td style="padding: 12px 16px; font-style: italic; color: #64748b; word-break: break-word; overflow-wrap: break-word; vertical-align: top;">
                ${note ? `<span style="display: block; background-color: #f1f5f9; border: 1px solid #e2e8f0; color: #334155; padding: 6px 10px; border-radius: 6px; font-size: 11px; font-family: sans-serif; font-style: normal; word-break: break-word; overflow-wrap: break-word;">${note}</span>` : `<span style="color: #cbd5e1;">—</span>`}
              </td>
            </tr>
          `;
        });

        tableHTML += `
                </tbody>
              </table>
            </div>
            </div>
          </div>
        `;
      });

      const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${docTitle}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@450;750&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Inter', system-ui, -apple-system, sans-serif;
      background-color: #ffffff;
      color: #1e293b;
      margin: 0;
      padding: 40px;
      line-height: 1.5;
    }
    .no-print-banner {
      background: #eef2ff;
      padding: 16px;
      border-radius: 12px;
      margin-bottom: 30px;
      font-size: 13px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border: 1px solid #c7d2fe;
      font-weight: 500;
    }
    .banner-text strong {
      color: #4f46e5;
    }
    .btn-print {
      background: #4f46e5;
      color: white;
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      font-weight: bold;
      cursor: pointer;
      font-size: 12px;
      transition: all 0.15s ease;
    }
    .btn-print:hover {
      background: #4338ca;
    }
    .header-container {
      border-bottom: 2px solid #e2e8f0;
      padding-bottom: 24px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      flex-wrap: wrap;
      gap: 16px;
    }
    .subtitle {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      letter-spacing: 0.15em;
      color: #94a3b8;
      margin: 0;
    }
    .title {
      font-size: 26px;
      font-weight: 800;
      color: #0f172a;
      margin: 4px 0 0 0;
      letter-spacing: -0.02em;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .date-box {
      font-size: 13px;
      text-align: right;
      color: #64748b;
      font-weight: 500;
      min-width: 180px;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
      gap: 24px;
      margin-bottom: 32px;
    }
    .metric-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 20px;
      word-break: break-word;
      overflow-wrap: break-word;
    }
    .metric-title {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 600;
      letter-spacing: 0.10em;
      color: #64748b;
    }
    .metric-value-container {
      margin-top: 10px;
      display: flex;
      align-items: baseline;
    }
    .metric-value {
      font-size: 26px;
      font-weight: 700;
      color: #0f172a;
    }
    .metric-desc {
      font-size: 12px;
      color: #64748b;
      margin-top: 6px;
    }
    .callout {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 16px;
      padding: 18px;
      display: flex;
      gap: 14px;
      align-items: center;
      margin-bottom: 32px;
    }
    .callout-title {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
      margin: 0;
    }
    .callout-text {
      font-size: 12px;
      color: #64748b;
      margin: 4px 0 0 0;
    }
    .section-divider {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 750;
      letter-spacing: 0.15em;
      color: #64748b;
      border-bottom: 1px solid #e2e8f0;
      padding-bottom: 8px;
      margin-top: 32px;
      margin-bottom: 20px;
    }
    @media (max-width: 640px) {
      body {
        padding: 16px;
      }
      .header-container {
        flex-direction: column;
        align-items: flex-start;
        gap: 12px;
      }
      .date-box {
        text-align: left;
        min-width: auto;
      }
      .metrics-grid {
        grid-template-columns: 1fr;
        gap: 16px;
      }
    }
    @media print {
      .no-print-banner {
        display: none !important;
      }
      body {
        padding: 0;
      }
    }
  </style>
</head>
<body>
  <div class="no-print-banner">
    <div class="banner-text">
      <strong>Offline Print File Activated!</strong> Click <strong>Print This Page</strong> or use keyboard shortcut <strong>Ctrl + P</strong> (or <strong>Cmd + P</strong> on Mac).
    </div>
    <button class="btn-print" onclick="window.print()">Print This Page</button>
  </div>

  <div class="header-container">
    <div>
      <p class="subtitle">${pSubtitle}</p>
      <h1 class="title">${pTitle}</h1>
    </div>
    <div class="date-box">
      <p>${formattedDate}</p>
      ${checkerName ? `<p style="font-size: 11px; margin: 4px 0 0 0; color: #4f46e5; font-weight: 700;">Verified by: ${checkerName}</p>` : ""}
      <p style="font-size: 9px; font-family: monospace; color: #94a3b8; margin: 4px 0 0 0; text-transform: uppercase;">Scope: Active Audit Run</p>
    </div>
  </div>

  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-title">Yield Progress</div>
      <div class="metric-value-container">
        <div class="metric-value">${percentage}%</div>
      </div>
      <div class="metric-desc">Completion rate yield</div>
    </div>
    <div class="metric-card">
      <div class="metric-title">Task Clearance</div>
      <div class="metric-value-container">
        <div class="metric-value">${completed} <span style="font-size: 16px; color: #94a3b8;">/ ${total}</span></div>
      </div>
      <div class="metric-desc">${total - completed} template points left.</div>
    </div>
    <div class="metric-card">
      <div class="metric-title">Session Annotations</div>
      <div class="metric-value-container">
        <div class="metric-value">${itemsWithNotes.length}</div>
      </div>
      <div class="metric-desc">Comments filled</div>
    </div>
  </div>

  <div class="callout">
    <div style="font-size: 20px; color: #4f46e5; font-weight: bold;">✔</div>
    <div>
      <h4 class="callout-title">${completed === total ? "Perfect Clearance Pass (100%)" : "Partial Audit Run"}</h4>
      <p class="callout-text">
        ${completed === total 
          ? "All compliance checklist templates, operational directives, and safety points completed successfully in this active test run." 
          : "Outstanding actions remaining. Verify open checklist states and complete points before final signoff."
        }
      </p>
    </div>
  </div>

  <div class="section-divider">Live Structured Audit Breakdown</div>

  ${tableHTML}

  <div style="border-top: 1px solid #e2e8f0; padding-top: 20px; margin-top: 40px; display: flex; justify-content: space-between; padding-left: 12px; padding-right: 12px; font-size: 10px; font-family: monospace; color: #94a3b8;">
    <div>Verification Audit System • ClearTask</div>
    <div>Notes field in-memory (not saved to storage)</div>
  </div>

  <script>
    // Launch print layout after load finishes
    window.addEventListener('DOMContentLoaded', () => {
      setTimeout(() => {
        window.print();
      }, 350);
    });
  </script>
</body>
</html>`;

      const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", url);
      const fileName = `${yyyymmdd} - checklist report.html`;
      downloadAnchor.setAttribute("download", fileName);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    const isSandboxIframe = window.self !== window.top;

    if (isSandboxIframe) {
      console.warn("Direct window.print() is blocked or restricted inside sandboxed preview iframes.");
      downloadPrintableHTML();
      const msg = "Since this application is previewed inside a secure sandbox iframe, direct printing is restricted by your browser. We have automatically downloaded a high-fidelity 'Printable HTML Report' file for you instead! Double-click that downloaded file to open and print it perfectly in one click. To print directly from the browser, click the 'Open' button on the top-right corner to open the app in a standalone tab.";
      if (onShowAlert) {
        onShowAlert("Print Action Configured", msg);
      } else {
        alert(msg);
      }
    } else {
      try {
        const oldTitle = document.title;
        document.title = `${getYYYYMMDD()} - checklist report`;
        window.print();
        setTimeout(() => {
          document.title = oldTitle;
        }, 1000);
      } catch (err) {
        console.error("Direct printing failed, falling back to download:", err);
        downloadPrintableHTML();
      }
    }
  };

  return (
    <div 
      id="report-overlay"
      className="max-w-4xl mx-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-md overflow-hidden motion-safe:animate-fade-in"
    >
      {/* Header bar with primary action buttons */}
      <div className="flex items-center justify-between px-8 py-5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 print:hidden">
        <button
          id="back-to-checklist-btn"
          type="button"
          onClick={onClose}
          className="flex items-center gap-2 text-slate-550 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 text-sm font-semibold transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Edit Checklist</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            id="print-report-btn"
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-all cursor-pointer shadow-xs hover:shadow-md"
            title="Print compliance checklist card"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Report</span>
          </button>

          <button
            id="copy-report-btn"
            type="button"
            onClick={handleCopy}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs rounded-lg font-bold tracking-wide uppercase transition-all cursor-pointer ${
              copied 
                ? "bg-emerald-600 hover:bg-emerald-700 text-white border border-transparent shadow-xs"
                : "bg-slate-100 hover:bg-slate-200 text-slate-850 dark:bg-slate-800 dark:hover:bg-slate-750 dark:text-slate-200 border border-transparent shadow-xs"
            }`}
          >
            <Copy className="w-3.5 h-3.5" />
            <span>{copied ? "Copied!" : "Copy (Markdown)"}</span>
          </button>
        </div>
      </div>

      <div className="p-4 sm:p-8 md:p-10 pt-6 sm:pt-10 print:p-0">
        {/* Printable Memo Area */}
        <div id="report-printable-area" className="flex flex-col gap-8">
          
          {/* Memo title */}
          <div className="border-b border-slate-200 dark:border-slate-800 pb-6">
            <div className="flex flex-col sm:flex-row justify-between sm:items-end gap-4">
              <div className="min-w-0 flex-1">
                <span className="text-[10px] uppercase font-mono tracking-[0.2em] font-bold text-slate-400 block break-words whitespace-normal">
                  {appSubtitle || "Document / Final Session Assessment"}
                </span>
                <h1 className="text-3xl font-display font-bold tracking-tight text-slate-800 dark:text-white mt-1 break-words leading-tight">
                  {appTitle || "Checklist Completion Report"}
                </h1>
              </div>
              <div className="text-xs font-semibold text-slate-500 text-left sm:text-right shrink-0 min-w-[200px] break-words whitespace-normal">
                <p>{formattedDate}</p>
                {checkerName && (
                  <p className="mt-1 font-sans text-slate-705 dark:text-slate-300 break-words">
                    Checked by: <span className="font-bold text-indigo-600 dark:text-indigo-450">{checkerName}</span>
                  </p>
                )}
                <p className="font-mono text-[10px] text-slate-400 mt-1 uppercase tracking-widest break-words">Scope: Active Audit Run</p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {/* Completion Gauge / Ring Panel (Radial SVG matching Live Report spec) */}
            <div className="bg-slate-50/75 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 flex items-center gap-5">
              <div className="w-20 h-20 rounded-full border-4 border-slate-100 dark:border-slate-900 flex items-center justify-center relative shrink-0">
                 <svg className="absolute inset-0 w-full h-full -rotate-90">
                   <circle 
                     cx="36" 
                     cy="36" 
                     r="32" 
                     fill="none" 
                     stroke="rgb(79 70 229)" 
                     strokeWidth="4" 
                     strokeDasharray="201.06" 
                     strokeDashoffset={201.06 - (percentage / 100) * 201.06}
                     className="transition-all duration-500"
                   ></circle>
                 </svg>
                 <span className="text-lg font-bold text-slate-800 dark:text-white">{percentage}%</span>
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Yield Progress</p>
                <p className="text-sm font-bold text-indigo-750 dark:text-indigo-400 mt-1">Completion rate yield</p>
              </div>
            </div>

            {/* Completion Counter */}
            <div className="bg-slate-50/75 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Task Clearance
              </span>
              <div className="flex items-baseline gap-1 mt-3">
                <span className="text-3xl font-mono font-bold text-slate-800 dark:text-white">
                  {completed}
                </span>
                <span className="text-slate-400 font-mono text-xl">/</span>
                <span className="text-xl font-mono text-slate-550 dark:text-slate-400 font-semibold">
                  {total}
                </span>
              </div>
              <p className="text-xs text-slate-450 dark:text-slate-500 mt-2 font-medium">
                {total - completed} template points left.
              </p>
            </div>

            {/* Note metrics */}
            <div className="bg-slate-50/75 dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between sm:col-span-2 md:col-span-1">
              <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
                Session Annotations
              </span>
              <div className="flex items-baseline gap-2 mt-3">
                <span className="text-3xl font-mono font-bold text-indigo-600 dark:text-indigo-400">
                  {itemsWithNotes.length}
                </span>
                <span className="text-xs font-mono text-slate-400">
                  remarks filled
                </span>
              </div>
            </div>
          </div>

          {/* Status statement Callout */}
          <div className="flex items-start gap-4 bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
            {completed === total ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Perfect Clearance Pass (100%)</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    All compliance checklist templates, operational directives, and safety points completed successfully in this active test run.
                  </p>
                </div>
              </>
            ) : (
              <>
                <AlertCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-slate-100">Partial Audit Run</h4>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Outstanding actions remaining. Use this session sheet as a temporary scratchpad record before printing.
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Core breakdown table */}
          <div className="mt-4 flex flex-col gap-6">
            <h3 className="text-xs uppercase tracking-[0.2em] font-bold text-slate-450 dark:text-slate-400 border-b border-slate-200 dark:border-slate-850 pb-2.5">
              Live Structured Audit Breakdown
            </h3>

            {categories.map(cat => {
              const catItems = items.filter(item => item.category === cat);
              if (catItems.length === 0) return null;

              return (
                <div key={cat} className="flex flex-col gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    <h4 className="font-display font-bold text-xs text-slate-800 dark:text-slate-200 uppercase tracking-widest">
                      {cat}
                    </h4>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-950">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px] text-left border-collapse table-fixed">
                        <thead>
                          <tr className="bg-slate-50 dark:bg-slate-900/50 text-[10px] font-mono uppercase tracking-wider text-slate-400 border-b border-slate-200 dark:border-slate-800">
                            <th className="py-3 px-4 font-bold w-28">Status</th>
                            <th className="py-3 px-4 font-bold w-2/5">Checkpoint Description</th>
                            <th className="py-3 px-4 font-bold w-[28%]">Description (Saved)</th>
                            <th className="py-3 px-4 font-bold w-[22%]">Notes (Transient)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-150 dark:divide-slate-850">
                          {catItems.map(item => {
                            const state = taskStates[item.id];
                            const hasDesc = state?.description && state.description.trim();
                            const hasNote = state?.note && state.note.trim();

                            return (
                              <tr key={item.id} className="text-xs hover:bg-slate-50/20 dark:hover:bg-slate-900/10 align-top">
                                <td className="py-4 px-4 font-mono font-bold break-words whitespace-normal">
                                  {state?.isCompleted ? (
                                    <span className="inline-flex items-center gap-1 text-indigo-600 font-medium">
                                      ✔ DONE
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 text-slate-400 font-medium font-bold">
                                      — PENDING
                                    </span>
                                  )}
                                </td>
                                <td className={`py-4 px-4 text-slate-700 dark:text-slate-350 leading-relaxed font-semibold break-words whitespace-normal ${
                                  state?.isCompleted ? "line-through text-slate-400! dark:text-slate-550!" : ""
                                }`}>
                                  {item.text}
                                </td>
                                <td className="py-4 px-4 text-slate-600 dark:text-slate-400 break-words whitespace-normal font-sans">
                                  {hasDesc ? (
                                    <span className="bg-emerald-50 dark:bg-emerald-950/25 border border-emerald-100 dark:border-emerald-900/30 text-[11px] text-emerald-850 dark:text-emerald-300 px-3 py-2 rounded-lg block font-sans font-medium leading-relaxed break-words whitespace-normal shadow-3xs">
                                      <LinkifiedText text={state.description.trim()} />
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-755 font-mono tracking-wider">—</span>
                                  )}
                                </td>
                                <td className="py-4 px-4 text-slate-500 dark:text-slate-400 break-words whitespace-normal font-sans">
                                  {hasNote ? (
                                    <span className="bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-650 dark:text-slate-300 px-3 py-2 rounded-lg block font-sans font-medium leading-relaxed break-words whitespace-normal shadow-3xs">
                                      <LinkifiedText text={state.note.trim()} />
                                    </span>
                                  ) : (
                                    <span className="text-slate-300 dark:text-slate-755 font-mono tracking-wider">—</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer of report */}
          <div className="border-t border-slate-250 dark:border-slate-800 pt-5 mt-4 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] text-slate-400 dark:text-slate-600 font-mono px-6 pb-2">
            {/*
            <p className="whitespace-nowrap">Verification Audit System • ClearTask</p>
            <p className="text-center sm:text-right">Notes and Annotations Saved to Storage</p>
            */}
          </div>

        </div>

        {/* Action Button: Reset Checklist */}
        <div className="mt-8 flex justify-center border-t border-slate-200 dark:border-slate-800 pt-6 print:hidden">
          <button
            id="reset-session-btn"
            type="button"
            onClick={onResetSession}
            className="flex items-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-100 text-red-650 hover:text-red-700 font-bold uppercase tracking-wider text-xs rounded-xl transition-all cursor-pointer shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Clear Run & Reset Draft Session</span>
          </button>
        </div>

      </div>
    </div>
  );
}
