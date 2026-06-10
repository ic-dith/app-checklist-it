import { useState, useEffect, useRef } from "react";
import { 
  ClipboardList, 
  CheckSquare, 
  FileText, 
  RotateCcw, 
  Info, 
  Layers, 
  SlidersHorizontal, 
  Search,
  CheckCircle,
  HelpCircle,
  Database,
  Upload,
  FileCode,
  AlertTriangle,
  Download,
  PanelLeftClose,
  PanelLeftOpen
} from "lucide-react";
import { ChecklistItem, SessionTaskState } from "./types";
import { DEFAULT_CATEGORIES } from "./data";
import { AddItemForm } from "./components/AddItemForm";
import { ChecklistItemRow } from "./components/ChecklistItemRow";
import { ReportView } from "./components/ReportView";
import { PRESETS_XML_RAW } from "./checklist_presets_xml_raw";
import { APP_CONFIG_XML_RAW } from "./app_config_xml_raw";
import { CATEGORIES_XML_RAW } from "./categories_xml_raw";

export default function App() {
  // --- STATE ---
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [taskStates, setTaskStates] = useState<Record<string, SessionTaskState>>({});
  const [activeView, setActiveView] = useState<"checklist" | "report">("checklist");
  
  // Ref to hold the debouncing timeout for immediate server-side description saving
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Refs to track absolute latest state values for background debounced saves
  const latestItemsRef = useRef<ChecklistItem[]>([]);
  const latestTaskStatesRef = useRef<Record<string, SessionTaskState>>({});
  
  // Custom dialog alert/confirm modal state (replaces window.confirm/alert for iframe compliance)
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    showCancel: boolean;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
    showCancel: true,
  });

  const triggerAlert = (title: string, message: string) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      showCancel: false,
      onConfirm: () => setConfirmModal(prev => ({ ...prev, isOpen: false })),
    });
  };

  const triggerConfirm = (title: string, message: string, onConfirm: () => void) => {
    setConfirmModal({
      isOpen: true,
      title,
      message,
      showCancel: true,
      onConfirm: () => {
        onConfirm();
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      },
    });
  };

  // State to hold app branding (easily customizable via app_config.xml)
  const [appTitle, setAppTitle] = useState("ClearTask Compliance");
  const [appSubtitle, setAppSubtitle] = useState("Operational Safety Checklist Template & Audit");

  // State to hold external categories list
  const [categories, setCategories] = useState<string[]>(DEFAULT_CATEGORIES);

  // State to hold the name of who does the check / inspector
  const [checkerName, setCheckerName] = useState(() => {
    return localStorage.getItem("checklist_checker_name") || "";
  });

  // Track currently active compliance preset source
  const [lastSourceLoaded, setLastSourceLoaded] = useState<string>("Local Storage Cache");

  // Real-time server files saving / loading status indicator
  const [syncStatus, setSyncStatus] = useState<"idle" | "syncing" | "success" | "error">("idle");

  // Filtering states
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // State to hold compiled deployment version dynamically retrieved from server APIs
  const [appVersion, setAppVersion] = useState<string>("");

  // Collapsible left sidebar control state (collapsed by default)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem("checklist_sidebar_collapsed");
    return saved !== null ? saved === "true" : true;
  });

  // Fetch deployment version details on mount
  useEffect(() => {
    fetch("/api/version")
      .then((res) => res.json())
      .then((data) => {
        if (data && data.version) {
          setAppVersion(data.version);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch deployment version from server:", err);
      });
  }, []);

  // Keep browser tab title in sync with the current app title
  useEffect(() => {
    if (appTitle) {
      document.title = appTitle;
    }
  }, [appTitle]);

  // Synchronize refs with state changes to guarantee debounced saves have latest values
  useEffect(() => {
    latestItemsRef.current = items;
  }, [items]);

  useEffect(() => {
    latestTaskStatesRef.current = taskStates;
  }, [taskStates]);

  // Get active distinct categories from existing items and categories list
  const activeCategories: string[] = ["All", ...Array.from(new Set([...categories, ...items.map((i) => i.category)]))];

  // Helper function to read and deserialize compliance checklist items & title/subtitle from XML string format
  const parseXMLItems = (xmlString: string): { items: ChecklistItem[], title?: string, subtitle?: string } => {
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlString, "text/xml");
    
    // Attempt to extract metadata
    const titleNode = xmlDoc.getElementsByTagName("title")[0]?.textContent?.trim() || undefined;
    const subtitleNode = xmlDoc.getElementsByTagName("subtitle")[0]?.textContent?.trim() || undefined;

    const itemsNode = xmlDoc.getElementsByTagName("item");
    const parsedItems: ChecklistItem[] = [];
    
    for (let i = 0; i < itemsNode.length; i++) {
       const node = itemsNode[i];
       const id = node.getElementsByTagName("id")[0]?.textContent?.trim() || `preset-xml-${Date.now()}-${i}`;
       const text = node.getElementsByTagName("text")[0]?.textContent?.trim() || "";
       const category = node.getElementsByTagName("category")[0]?.textContent?.trim() || "General";
       const description = node.getElementsByTagName("description")[0]?.textContent?.trim() || "";
       if (text) {
         parsedItems.push({
           id,
           text,
           category,
           createdAt: Date.now() - i * 1000,
           description,
         });
       }
     }
    return { items: parsedItems, title: titleNode, subtitle: subtitleNode };
  };

  // Helper function to read categories list from XML string format
  const parseXMLCategories = (xmlString: string): string[] => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      const categoryNodes = xmlDoc.getElementsByTagName("category");
      const parsedCats: string[] = [];
      for (let i = 0; i < categoryNodes.length; i++) {
        const catText = categoryNodes[i].textContent?.trim();
        if (catText) {
          parsedCats.push(catText);
        }
      }
      return parsedCats.length > 0 ? parsedCats : DEFAULT_CATEGORIES;
    } catch (e) {
      console.error("[App] Categories XML parse error:", e);
      return DEFAULT_CATEGORIES;
    }
  };

  // --- LOGIC: TEMPLATE PERSISTENCE & LOAD ---
  useEffect(() => {
    const initData = async () => {
      let finalTitle = "";
      let finalSubtitle = "";
      let loadedItems: ChecklistItem[] = [];
      let loadedCategories: string[] = [];
      let sourceName = "Server XML Files";
      let serverSyncSuccess = false;

      try {
        const response = await fetch("/api/load-checklist?t=" + Date.now());
        if (!response.ok) {
          throw new Error("Load checklist API failed");
        }
        const data = await response.json();
        
        // 1. Process server-loaded configuration XML file
        if (data.configXml) {
          const parser = new DOMParser();
          const configDoc = parser.parseFromString(data.configXml, "text/xml");
          const titleText = configDoc.getElementsByTagName("title")[0]?.textContent?.trim();
          const subtitleText = configDoc.getElementsByTagName("subtitle")[0]?.textContent?.trim();
          if (titleText) finalTitle = titleText;
          if (subtitleText) finalSubtitle = subtitleText;
        }

        // 2. Process server-loaded checklist XML file
        if (data.presetsXml && data.presetsXml.includes("<checklist>")) {
          const parsed = parseXMLItems(data.presetsXml);
          loadedItems = parsed.items;
          if (parsed.title && !finalTitle) finalTitle = parsed.title;
          if (parsed.subtitle && !finalSubtitle) finalSubtitle = parsed.subtitle;
          serverSyncSuccess = true;
        }

        // 3. Process server-loaded categories XML file
        if (data.categoriesXml) {
          loadedCategories = parseXMLCategories(data.categoriesXml);
        }
      } catch (err) {
        console.warn("[App] Could not fetch real-time XML state from server, falling back to cache:", err);
        sourceName = "Local Storage Cache";
      }

      // If server loading failed, use LocalStorage or compile-time defaults
      if (!serverSyncSuccess) {
        // Fallback: Check local storage
        const savedItems = localStorage.getItem("checklist_items");
        if (savedItems) {
          try {
            loadedItems = JSON.parse(savedItems);
            const savedTitle = localStorage.getItem("checklist_app_title");
            const savedSubtitle = localStorage.getItem("checklist_app_subtitle");
            if (savedTitle && !finalTitle) finalTitle = savedTitle;
            if (savedSubtitle && !finalSubtitle) finalSubtitle = savedSubtitle;
            sourceName = "Local Storage Cache";
          } catch (e) {
            console.error("Local Storage parse error:", e);
          }
        }

        const savedCategories = localStorage.getItem("checklist_categories");
        if (savedCategories) {
          try {
            loadedCategories = JSON.parse(savedCategories);
          } catch (e) {
            console.error("Local Storage categories parse error:", e);
          }
        }
      }

      // Still empty and server loading failed? Fallback to static imports
      if (!serverSyncSuccess && loadedItems.length === 0) {
        try {
          const parsed = parseXMLItems(PRESETS_XML_RAW);
          loadedItems = parsed.items;
          sourceName = "Dedicated XML Presets (Fallback)";
        } catch (e) {
          console.error("Bundled fallback XML parse error:", e);
        }
      }

      if (loadedCategories.length === 0) {
        try {
          loadedCategories = parseXMLCategories(CATEGORIES_XML_RAW);
        } catch (e) {
          console.error("Bundled fallback categories parse error:", e);
        }
      }

      // If configuration title is still empty, load it from raw config bundle
      if (!finalTitle || !finalSubtitle) {
        try {
          const parser = new DOMParser();
          const configDoc = parser.parseFromString(APP_CONFIG_XML_RAW, "text/xml");
          const titleText = configDoc.getElementsByTagName("title")[0]?.textContent?.trim();
          const subtitleText = configDoc.getElementsByTagName("subtitle")[0]?.textContent?.trim();
          if (titleText && !finalTitle) finalTitle = titleText;
          if (subtitleText && !finalSubtitle) finalSubtitle = subtitleText;
        } catch (e) {
          console.error("Bundled config XML parse error:", e);
        }
      }

      // Default hardcodes if everything failed
      if (!finalTitle) finalTitle = "ClearTask Compliance";
      if (!finalSubtitle) finalSubtitle = "Operational Safety Checklist Template & Audit";

      // Set global branding and list states
      setAppTitle(finalTitle);
      setAppSubtitle(finalSubtitle);
      setItems(loadedItems);
      setCategories(loadedCategories);
      setLastSourceLoaded(sourceName);

      // Cache current template configuration locally
      localStorage.setItem("checklist_items", JSON.stringify(loadedItems));
      localStorage.setItem("checklist_categories", JSON.stringify(loadedCategories));
      localStorage.setItem("checklist_app_title", finalTitle);
      localStorage.setItem("checklist_app_subtitle", finalSubtitle);

      // 3. Load assessment ticks state
      const savedTicks = localStorage.getItem("checklist_session_ticks");
      let ticksMap: Record<string, any> = {};
      if (savedTicks) {
        try {
          ticksMap = JSON.parse(savedTicks);
        } catch (e) {
          console.error("Error parsing saved session ticks:", e);
        }
      }

      // Initialize temporary in-memory session states
      const initialStates: Record<string, SessionTaskState> = {};
      loadedItems.forEach((item) => {
        const val = ticksMap[item.id];
        const isCompleted = typeof val === "object" && val !== null ? !!val.isCompleted : !!val;
        const checkedBy = typeof val === "object" && val !== null ? val.checkedBy : (isCompleted ? "Auditor" : undefined);
        const description = typeof val === "object" && val !== null ? (val.description || "") : (item.description || "");
        const status = typeof val === "object" && val !== null ? val.status : undefined;
        
        initialStates[item.id] = {
          itemId: item.id,
          isCompleted,
          note: "", // Held strictly in memory
          description,
          checkedBy,
          status,
        };
      });
      setTaskStates(initialStates);
    };

    initData();
  }, []);

  // Sync edited checklist items to localStorage
  const saveItemsList = (
    updatedItems: ChecklistItem[],
    customTitle?: string,
    customSubtitle?: string,
    updatedCategories?: string[],
    statesOverride?: Record<string, SessionTaskState>
  ) => {
    const activeStates = statesOverride || taskStates;
    const itemsWithDescription = updatedItems.map((item) => ({
      ...item,
      description: activeStates[item.id]?.description || item.description || "",
    }));

    setItems(itemsWithDescription);
    localStorage.setItem("checklist_items", JSON.stringify(itemsWithDescription));
    setSyncStatus("syncing");
    
    const targetTitle = customTitle !== undefined ? customTitle : appTitle;
    const targetSubtitle = customSubtitle !== undefined ? customSubtitle : appSubtitle;
    const targetCategories = updatedCategories !== undefined ? updatedCategories : categories;

    if (customTitle !== undefined) {
      setAppTitle(customTitle);
      localStorage.setItem("checklist_app_title", customTitle);
    }
    if (customSubtitle !== undefined) {
      setAppSubtitle(customSubtitle);
      localStorage.setItem("checklist_app_subtitle", customSubtitle);
    }
    if (updatedCategories !== undefined) {
      setCategories(updatedCategories);
      localStorage.setItem("checklist_categories", JSON.stringify(updatedCategories));
    }

    // Call server API backend route to synchronize updated XML configurations, presets, and categories to disk files directly
    fetch("/api/save-checklist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: itemsWithDescription,
        title: targetTitle,
        subtitle: targetSubtitle,
        categories: targetCategories,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Disk synchronization failed.");
        }
        return res.json();
      })
      .then((data) => {
        console.log("[App] Synced with server XML presets repository:", data.message);
        setSyncStatus("success");
        setTimeout(() => setSyncStatus("idle"), 2500);
      })
      .catch((err) => {
        console.error("[App] Failed to auto-sync template with XML files on server filesystem:", err);
        setSyncStatus("error");
      });
  };

  // Sync completion states to localStorage with operator names (excluding notes!)
  const syncTicksToStorage = (updatedStates: Record<string, SessionTaskState>) => {
    const ticksMap: Record<string, { isCompleted: boolean; checkedBy?: string; description?: string; status?: "ok" | "warning" | "error" }> = {};
    Object.keys(updatedStates).forEach((key) => {
      ticksMap[key] = {
        isCompleted: !!updatedStates[key].isCompleted,
        checkedBy: updatedStates[key].checkedBy,
        description: updatedStates[key].description || "",
        status: updatedStates[key].status,
      };
    });
    localStorage.setItem("checklist_session_ticks", JSON.stringify(ticksMap));
  };

  // --- ACTIONS: XML DIRECT READING ENGINES ---
  const loadFromDedicatedXML = async () => {
    try {
      setSyncStatus("syncing");
      const response = await fetch("/api/load-checklist?t=" + Date.now());
      if (!response.ok) {
        throw new Error("Disk fetch failed");
      }
      const data = await response.json();
      
      if (data.presetsXml) {
        const parsed = parseXMLItems(data.presetsXml);
        
        let baseTitle = "ClearTask Compliance";
        let baseSubtitle = "Operational Safety Checklist Template & Audit";
        
        if (data.configXml) {
          const parser = new DOMParser();
          const configDoc = parser.parseFromString(data.configXml, "text/xml");
          baseTitle = configDoc.getElementsByTagName("title")[0]?.textContent?.trim() || baseTitle;
          baseSubtitle = configDoc.getElementsByTagName("subtitle")[0]?.textContent?.trim() || baseSubtitle;
        }

        // Allow empty checklist files as a valid clean template source
        setItems(parsed.items);
        localStorage.setItem("checklist_items", JSON.stringify(parsed.items));
        setAppTitle(baseTitle);
        localStorage.setItem("checklist_app_title", baseTitle);
        setAppSubtitle(baseSubtitle);
        localStorage.setItem("checklist_app_subtitle", baseSubtitle);
        
        const newStates: Record<string, SessionTaskState> = {};
        parsed.items.forEach((item) => {
          newStates[item.id] = {
            itemId: item.id,
            isCompleted: false,
            description: item.description || "",
            note: "",
            status: undefined,
          };
        });
        setTaskStates(newStates);
        syncTicksToStorage(newStates);
        setLastSourceLoaded("Server XML Files");
        setSyncStatus("success");
        setTimeout(() => setSyncStatus("idle"), 2500);
        triggerAlert("Default XML Loaded", "Successfully reloaded the direct original XML checklists & metadata from the server file system.");
      } else {
        throw new Error("No XML template payload on the server.");
      }
    } catch (e: any) {
      console.error(e);
      setSyncStatus("error");
      triggerAlert("XML Reload Error", `Failed to load XML files from server workspace disk: ${e.message}`);
    }
  };

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".xml")) {
      triggerAlert("File Extension Error", "Unsupported file type. Please upload a valid structured checklist template as a .xml file.");
      e.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (!content) return;

      try {
        const parsed = parseXMLItems(content);

        if (parsed.items.length === 0) {
          triggerAlert("XML Schema Error", "No <item> elements found. Setup requires <item><text>value</text><category>value</category></item> blocks.");
          return;
        }

        // Save items list and set app title/subtitle dynamically if defined in upload
        saveItemsList(parsed.items, parsed.title, parsed.subtitle);
        
        const newStates: Record<string, SessionTaskState> = {};
        parsed.items.forEach((item) => {
          newStates[item.id] = {
            itemId: item.id,
            isCompleted: false,
            description: item.description || "",
            note: "",
            status: undefined,
          };
        });
        setTaskStates(newStates);
        syncTicksToStorage(newStates);
        setLastSourceLoaded(`Uploaded XML: ${file.name}`);
        triggerAlert("XML Load Completed", `Successfully loaded checklist template with ${parsed.items.length} points from ${file.name}!`);
      } catch (err) {
        console.error(err);
        triggerAlert("File Loader Parse Error", "Parsing failed. Check XML code validity.");
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const exportToXMLFile = () => {
    setSyncStatus("syncing");
    const itemsWithDescription = items.map((item) => ({
      ...item,
      description: taskStates[item.id]?.description || item.description || "",
    }));

    fetch("/api/save-checklist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: itemsWithDescription,
        title: appTitle,
        subtitle: appSubtitle,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Could not sync latest items before export.");
        }
        return res.json();
      })
      .then(() => {
        setSyncStatus("success");
        setTimeout(() => setSyncStatus("idle"), 2500);
        
        // Safely fetch and download the file as a Blob to prevent full-page navigation / iframe reset:
        fetch("/api/download-checklist?t=" + Date.now())
          .then((response) => {
            if (!response.ok) throw new Error("Load downloaded file failed");
            return response.blob();
          })
          .then((blob) => {
            const blobUrl = window.URL.createObjectURL(blob);
            const downloadAnchor = document.createElement("a");
            downloadAnchor.href = blobUrl;
            downloadAnchor.setAttribute("download", "checklist_presets.xml");
            document.body.appendChild(downloadAnchor);
            downloadAnchor.click();
            downloadAnchor.remove();
            window.URL.revokeObjectURL(blobUrl);
            
            setLastSourceLoaded("Server XML Files");
            triggerAlert("Export Completed", "Successfully compiled and downloaded checklist_presets.xml directly matching your current active template!");
          })
          .catch((dlErr) => {
            console.error("[App] Fallback direct download due to blob error:", dlErr);
            window.location.href = "/api/download-checklist?t=" + Date.now();
          });
      })
      .catch((err) => {
        console.error("[App] Export failure:", err);
        setSyncStatus("error");
        triggerAlert("Export Error", "Failed to compile, synchronize, and download XML presets.");
      });
  };

  const downloadCategoriesFile = () => {
    fetch("/api/download-categories?t=" + Date.now())
      .then((response) => {
        if (!response.ok) throw new Error("Load downloaded file failed");
        return response.blob();
      })
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const downloadAnchor = document.createElement("a");
        downloadAnchor.href = blobUrl;
        downloadAnchor.setAttribute("download", "categories.xml");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch((err) => {
        console.error("[App] Categories download failure:", err);
        window.location.href = "/api/download-categories?t=" + Date.now();
      });
  };

  const downloadConfigFile = () => {
    fetch("/api/download-config?t=" + Date.now())
      .then((response) => {
        if (!response.ok) throw new Error("Load downloaded file failed");
        return response.blob();
      })
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const downloadAnchor = document.createElement("a");
        downloadAnchor.href = blobUrl;
        downloadAnchor.setAttribute("download", "app_config.xml");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        window.URL.revokeObjectURL(blobUrl);
      })
      .catch((err) => {
        console.error("[App] Config download failure:", err);
        window.location.href = "/api/download-config?t=" + Date.now();
      });
  };

  const downloadAllXmlZip = () => {
    fetch("/api/download-all-zip?t=" + Date.now())
      .then((response) => {
        if (!response.ok) throw new Error("Load downloaded ZIP failed");
        return response.blob();
      })
      .then((blob) => {
        const blobUrl = window.URL.createObjectURL(blob);
        const downloadAnchor = document.createElement("a");
        downloadAnchor.href = blobUrl;
        downloadAnchor.setAttribute("download", "checklist_core_xmls.zip");
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        window.URL.revokeObjectURL(blobUrl);
        triggerAlert("Download Succeeded", "Successfully packed and downloaded all XML configuration files inside checklist_core_xmls.zip!");
      })
      .catch((err) => {
        console.error("[App] ZIP download failure:", err);
        window.location.href = "/api/download-all-zip?t=" + Date.now();
      });
  };

  const saveAndDownloadZip = () => {
    setSyncStatus("syncing");
    const itemsWithDescription = items.map((item) => ({
      ...item,
      description: taskStates[item.id]?.description || item.description || "",
    }));

    fetch("/api/save-checklist", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        items: itemsWithDescription,
        title: appTitle,
        subtitle: appSubtitle,
        categories: categories,
      }),
    })
      .then((res) => {
        if (!res.ok) {
          throw new Error("Could not sync latest items before zip export.");
        }
        return res.json();
      })
      .then(() => {
        setSyncStatus("success");
        setTimeout(() => setSyncStatus("idle"), 2500);
        downloadAllXmlZip();
      })
      .catch((err) => {
        console.error("[App] Zip Export failure:", err);
        setSyncStatus("error");
        triggerAlert("Export Error", "Failed to compile, synchronize, and download XML presets.");
      });
  };

  // --- ACTIONS ---
  const handleAddItem = (text: string, category: string) => {
    const newItem: ChecklistItem = {
      id: `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      text,
      category,
      createdAt: Date.now(),
    };

    const updatedItems = [...items, newItem];
    saveItemsList(updatedItems);

    // Initialize state for the new task
    setTaskStates((prev) => {
      const next = {
        ...prev,
        [newItem.id]: {
          itemId: newItem.id,
          isCompleted: false,
          description: "",
          note: "",
        },
      };
      syncTicksToStorage(next);
      return next;
    });
  };

  const handleToggleComplete = (id: string) => {
    // Enforce that a checking operator name is entered before checking task items
    const currentTask = taskStates[id] || { itemId: id, isCompleted: false, note: "", description: "" };
    const checkingOn = !currentTask.isCompleted;

    if (checkingOn && (!checkerName || !checkerName.trim())) {
      triggerAlert(
        "Operator Name Required",
        "The operator name is mandatory. Please enter the name of the person performing the check at the top of the page before checking off tasks."
      );
      
      // Select and focus the input field for the operator name
      setTimeout(() => {
        const input = document.getElementById("checker-name-input-field");
        if (input) {
          input.scrollIntoView({ behavior: "smooth", block: "center" });
          input.focus();
        }
      }, 150);
      return;
    }

    if (checkingOn && !currentTask.status) {
      triggerAlert(
        "Status Selection Required",
        "Choosing a status (OK, Warning, or Error) is mandatory before completing or checking off this checklist item."
      );
      return;
    }

    setTaskStates((prev) => {
      const current = prev[id] || { itemId: id, isCompleted: false, note: "", description: "" };
      const next = {
        ...prev,
        [id]: {
          ...current,
          isCompleted: !current.isCompleted,
          checkedBy: !current.isCompleted ? checkerName.trim() : undefined,
        },
      };
      syncTicksToStorage(next);
      return next;
    });
  };

  const handleUpdateNote = (id: string, note: string) => {
    // Update local task state but do NOT save notes to localStorage
    setTaskStates((prev) => {
      const current = prev[id] || { itemId: id, isCompleted: false, note: "", description: "" };
      return {
        ...prev,
        [id]: {
          ...current,
          note,
        },
      };
    });
  };

  const handleUpdateStatus = (id: string, status: "ok" | "warning" | "error" | undefined) => {
    if (!checkerName || !checkerName.trim()) {
      triggerAlert(
        "Operator Name Required",
        "The operator name is mandatory. Please enter the name of the person performing the check at the top of the page before selecting a status."
      );
      
      // Select and focus the input field for the operator name
      setTimeout(() => {
        const input = document.getElementById("checker-name-input-field");
        if (input) {
          input.scrollIntoView({ behavior: "smooth", block: "center" });
          input.focus();
        }
      }, 150);
      return;
    }

    setTaskStates((prev) => {
      const current = prev[id] || { itemId: id, isCompleted: false, note: "", description: "" };
      
      const hasOperator = !!checkerName && checkerName.trim().length > 0;
      const willBeCompleted = !!status && (hasOperator ? true : current.isCompleted);
      const assignedOperator = !!status && hasOperator ? checkerName.trim() : (status ? current.checkedBy : undefined);

      const next = {
        ...prev,
        [id]: {
          ...current,
          status,
          isCompleted: willBeCompleted,
          checkedBy: assignedOperator,
        },
      };
      
      syncTicksToStorage(next);
      return next;
    });
  };

  const handleUpdateDescription = (id: string, description: string) => {
    // 1. Immediately update local template items state
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        return { ...item, description };
      }
      return item;
    });
    setItems(updatedItems);
    latestItemsRef.current = updatedItems;
    localStorage.setItem("checklist_items", JSON.stringify(updatedItems));

    // 2. Update local task state and save description directly to localStorage
    setTaskStates((prev) => {
      const current = prev[id] || { itemId: id, isCompleted: false, note: "", description: "" };
      const next = {
        ...prev,
        [id]: {
          ...current,
          description,
        },
      };
      latestTaskStatesRef.current = next;
      syncTicksToStorage(next);
      return next;
    });

    // 3. Trigger debounced immediate server-side XML saving using the guaranteed latest references
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      saveItemsList(
        latestItemsRef.current,
        undefined,
        undefined,
        undefined,
        latestTaskStatesRef.current
      );
    }, 400);
  };

  const handleDeleteTemplateItem = (id: string) => {
    triggerConfirm(
      "Delete Checklist Task?",
      "Are you sure you want to permanently delete this checkpoint from your template folder? This cannot be undone.",
      () => {
        const updatedItems = items.filter((item) => item.id !== id);
        saveItemsList(updatedItems);

        setTaskStates((prev) => {
          const next = { ...prev };
          delete next[id];
          syncTicksToStorage(next);
          return next;
        });
      }
    );
  };

  const handleEditTemplateItem = (id: string, newText: string) => {
    const updatedItems = items.map((item) => {
      if (item.id === id) {
        return { ...item, text: newText };
      }
      return item;
    });
    saveItemsList(updatedItems);
  };

  const handleResetSession = () => {
    triggerConfirm(
      "Reset Active Assessment Run?",
      "This will clear all verified ticks, purge your temporary scratchpad remarks, and reset the operator name. Your checklist template configuration will remain intact.",
      () => {
        // Clear session ticks in localStorage
        localStorage.removeItem("checklist_session_ticks");
        
        // Reset checker name
        setCheckerName("");
        localStorage.removeItem("checklist_checker_name");

        // Reset in-memory session states
        const resetStates: Record<string, SessionTaskState> = {};
        items.forEach((item) => {
          resetStates[item.id] = {
            itemId: item.id,
            isCompleted: false,
            description: taskStates[item.id]?.description || item.description || "",
            note: "", // Reset all notes to empty
            status: undefined,
          };
        });
        setTaskStates(resetStates);
        syncTicksToStorage(resetStates);
        setActiveView("checklist");
      }
    );
  };

  // --- FILTERING LOGIC ---
  const filteredItems = items.filter((item) => {
    const matchesCategory = selectedCategory === "All" || item.category === selectedCategory;
    const matchesSearch = item.text.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Math variables
  const completedCount = items.filter((item) => taskStates[item.id]?.isCompleted).length;
  const totalCount = items.length;
  const progressPercent = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-50 font-sans antialiased pb-20">
      {/* Primary Top Bar Header */}
      <header className="sticky top-0 z-40 w-full h-20 flex items-center bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-8 print:hidden">
        <div className="w-full max-w-7xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 bg-indigo-600 dark:bg-indigo-500 text-white rounded-xl shadow-xs">
              <ClipboardList className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-display font-bold tracking-tight text-slate-900 dark:text-white">{appTitle}</h1>
                {appVersion && (
                  <span className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-800 leading-none shrink-0" title="Deployment version">
                    {appVersion}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 font-medium">{appSubtitle}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeView === "checklist" ? (
              <button
                id="generate-report-trigger-btn"
                onClick={() => setActiveView("report")}
                disabled={items.length === 0}
                className={`h-10 px-5 rounded-lg flex items-center gap-2 font-semibold text-sm transition-all cursor-pointer ${
                  items.length === 0
                    ? "bg-slate-200 text-slate-400 dark:bg-slate-800 dark:text-slate-650 cursor-not-allowed"
                    : "bg-indigo-600 hover:bg-indigo-700 text-white active:scale-[0.98] shadow-xs hover:shadow-md"
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Generate Completion Report</span>
              </button>
            ) : (
              <button
                id="back-trigger-btn"
                onClick={() => setActiveView("checklist")}
                className="h-10 px-5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-850 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-lg flex items-center gap-1.5 font-semibold text-sm transition-all cursor-pointer"
              >
                <CheckSquare className="w-4 h-4" />
                <span>Back to Checklist</span>
              </button>
            )}
          </div>

        </div>
      </header>

      {/* Main Container Workspace */}
      <main id="main-container" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 animate-fade-in">
        
        {activeView === "report" ? (
          /* REPORT VIEW MODE */
          <ReportView 
            items={items}
            taskStates={taskStates}
            onClose={() => setActiveView("checklist")}
            onResetSession={handleResetSession}
            onShowAlert={triggerAlert}
            appTitle={appTitle}
            appSubtitle={appSubtitle}
            checkerName={checkerName}
          />
        ) : (
          /* WORKSPACE ACTIVE CHECKLIST EDIT/FILL MODE */
          <div className="flex flex-col gap-6">
            
            {/* Checker / Auditor Header Identification Card */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/45 text-indigo-600 dark:text-indigo-400 rounded-lg shrink-0">
                  <CheckCircle className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-slate-850 dark:text-slate-100">Name of person checking</h4>
                  <p className="text-[11px] text-slate-400">Auditor or operator currently auditing these tasks</p>
                </div>
              </div>
              
              <div className="w-full sm:w-80 flex flex-col gap-1.5">
                <div className="relative">
                  <label className="sr-only" htmlFor="checker-name-input-field">Operator checking</label>
                  <input
                    id="checker-name-input-field"
                    type="text"
                    placeholder="Enter auditor's name... (e.g. Mario Rossi)"
                    value={checkerName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCheckerName(val);
                      localStorage.setItem("checklist_checker_name", val);
                    }}
                    className={`w-full h-10 px-4 text-sm bg-slate-50 dark:bg-slate-950 border rounded-lg text-slate-850 dark:text-slate-200 focus:outline-none focus:ring-1 font-medium placeholder-slate-400 ${
                      !checkerName.trim()
                        ? "border-red-300 dark:border-red-900/40 focus:ring-red-500 ring-red-100 dark:bg-red-950/10"
                        : "border-slate-200 dark:border-slate-800 focus:ring-indigo-500"
                    }`}
                  />
                </div>
                {!checkerName.trim() && (
                  <span className="text-[10px] text-red-500 dark:text-red-400 font-bold flex items-center gap-1 self-start sm:self-end">
                    <AlertTriangle className="w-3.5 h-3.5" /> Mandatory - Enter name to tick tasks
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* LEFT COLUMN: Upload, Save, Analytics & Manage Controls (Span 5) */}
            <div className={`flex flex-col gap-6 transition-all duration-300 ${sidebarCollapsed ? "hidden lg:hidden" : "lg:col-span-5"}`}>
              
              {/* Primary file loading center */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs flex flex-col gap-5">
                <div className="flex items-center gap-2.5">
                  <Database className="w-5 h-5 text-indigo-600" />
                  <div>
                    <h3 className="text-slate-900 dark:text-slate-100 font-display font-bold text-sm">
                      Checklist File Engine
                    </h3>
                    <p className="text-[11px] text-slate-400">Directly run or save XML templates</p>
                  </div>
                </div>

                {/* Primary Upload dropzone */}
                <div className="relative flex items-center justify-center border-2 border-dashed border-indigo-200 dark:border-slate-800 rounded-2xl p-6 hover:border-indigo-500 hover:bg-slate-50/50 dark:hover:bg-slate-850/30 transition-all cursor-pointer bg-slate-50/25">
                  <input
                    id="custom-file-upload"
                    type="file"
                    accept=".xml"
                    onChange={handleCustomFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    title="Upload local .xml template to run"
                  />
                  <div className="flex flex-col items-center gap-2 text-center pointer-events-none">
                    <Upload className="w-6 h-6 text-indigo-600" />
                    <span className="text-sm font-bold text-slate-850 dark:text-slate-200">
                      Upload Custom XML Template
                    </span>
                    <span className="text-[11px] text-slate-400 max-w-xs leading-relaxed">
                      Select or drop any checklist template XML to instant-load with custom branding.
                    </span>
                  </div>
                </div>

                 {/* Save modifications - offline sync loop */}
                {items.length > 0 && (
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 mt-2 flex flex-col gap-3">
                    <div>
                      <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block mb-1">
                        Save / Export XML Package
                      </label>
                      <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
                        Retrieve a single compressed <strong>ZIP</strong> containing your custom tasks, categories, and title files.
                      </p>
                    </div>

                    <div className="flex flex-col gap-2">
                      <button
                        id="download-all-zip-btn"
                        type="button"
                        onClick={saveAndDownloadZip}
                        className="flex justify-center items-center gap-2.5 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-md"
                        title="Download a single ZIP archive containing all 3 modified XML files"
                      >
                        <Download className="w-4 h-4" />
                        <span>Download XML Package (ZIP)</span>
                      </button>
                    </div>

                    {/* GitHub Sync step-by-step assistant */}
                    <div className="mt-2 p-3.5 bg-indigo-50/50 dark:bg-slate-950/40 rounded-xl border border-indigo-100/50 dark:border-indigo-900/30 animate-fade-in">
                      <div className="flex items-center gap-2 mb-1.5 text-indigo-700 dark:text-indigo-450 font-bold text-xs uppercase tracking-wide">
                        <Info className="w-3.5 h-3.5 shrink-0" />
                        <span>Commit Permanently to GitHub</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed mb-2.5">
                        Azure containers are temporary. Any tasks or categories added here are saved on the server's temporary storage, which resets on new deployments. To keep them forever:
                      </p>
                      <ol className="text-[10.5px] text-slate-650 dark:text-slate-350 space-y-1.5 pl-4 list-decimal leading-relaxed">
                        <li>
                          Modify tasks or categories here, then click <strong className="text-slate-850 dark:text-white">Download XML Package (ZIP)</strong>.
                        </li>
                        <li>
                          Extract the package and place the 3 XML files (<code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9.5px]">checklist_presets.xml</code>, <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9.5px]">categories.xml</code>, and <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9.5px]">app_config.xml</code>) into the <code className="px-1 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-[9.5px]">src/</code> directory of your local repository.
                        </li>
                        <li>
                          Commit and push changes to <strong className="text-slate-850 dark:text-white">GitHub</strong> so the project builds permanently with your configurations.
                        </li>
                      </ol>
                    </div>
                  </div>
                )}



              </div>
              
              {/* Progress Panel */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs">
                <h3 className="text-slate-900 dark:text-slate-100 font-display font-bold text-sm mb-4">Run Progress Summary</h3>
                
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold uppercase font-mono text-slate-400 tracking-wider">
                    Checked Items
                  </span>
                  <span className="text-sm font-bold font-mono">
                    {completedCount} / {totalCount} tasks
                  </span>
                </div>

                <div className="w-full bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-full rounded-full transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>

                <div className="flex justify-between items-center mt-5 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div>
                    <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-slate-400 block">Overall Yield</span>
                    <span className="text-2xl font-mono font-bold text-slate-800 dark:text-white">{progressPercent}%</span>
                  </div>
                  {(completedCount > 0 || items.some((item) => taskStates[item.id]?.note?.trim())) && (
                    <button
                      id="reset-ticks-btn"
                      type="button"
                      onClick={handleResetSession}
                      className="text-xs text-red-650 hover:text-red-700 bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-950/45 px-3 py-1.5 rounded-lg font-bold uppercase tracking-wider transition-all cursor-pointer flex items-center gap-1.5"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Reset Run</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Add form */}
              <AddItemForm onAddItem={handleAddItem} categories={categories} />

              {/* Manage External Categories XML File */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs flex flex-col gap-3.5">
                <div className="flex items-center gap-2.5">
                  <Layers className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <h3 className="text-slate-900 dark:text-slate-100 font-display font-bold text-sm">
                      Manage Categories File
                    </h3>
                    <p className="text-[11px] text-slate-400">Read & write categories of the external XML file</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto border border-slate-150 dark:border-slate-800 rounded-xl p-3 bg-slate-50/55 dark:bg-slate-950/20">
                  {categories.map((cat) => {
                    const inUse = items.some(item => item.category === cat);
                    return (
                      <span key={cat} className="inline-flex items-center gap-1.5 text-xs bg-white dark:bg-slate-900 px-2.5 py-1 border border-slate-200 dark:border-slate-800 rounded-full font-semibold text-slate-705 dark:text-slate-200">
                        <span>{cat}</span>
                        <button
                          type="button"
                          disabled={inUse && categories.length > 1}
                          onClick={() => {
                            if (inUse) {
                              triggerAlert("Cannot Delete", `"${cat}" is currently being used by some checklist items.`);
                              return;
                            }
                            const nextCats = categories.filter(c => c !== cat);
                            saveItemsList(items, undefined, undefined, nextCats);
                          }}
                          className={`w-3.5 h-3.5 rounded-full flex items-center justify-center text-xs hover:bg-slate-100 dark:hover:bg-slate-805 border-0 outline-0 transition-colors ${
                            inUse ? "text-slate-300 dark:text-slate-700 cursor-not-allowed" : "text-red-550 hover:text-red-700 font-bold cursor-pointer"
                          }`}
                          title={inUse ? "Category in use" : "Delete category"}
                        >
                          ×
                        </button>
                      </span>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <input
                    id="new-category-quick"
                    type="text"
                    placeholder="New category name..."
                    className="flex-1 h-9 px-3 text-xs bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-800 dark:text-slate-250 focus:outline-none placeholder-slate-400 font-medium"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const val = e.currentTarget.value.trim();
                        if (val) {
                          if (categories.includes(val)) {
                            triggerAlert("Duplicate Category", "This category already exists.");
                            return;
                          }
                          const nextCats = [...categories, val];
                          saveItemsList(items, undefined, undefined, nextCats);
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const input = document.getElementById("new-category-quick") as HTMLInputElement;
                      const val = input?.value.trim();
                      if (val) {
                        if (categories.includes(val)) {
                          triggerAlert("Duplicate Category", "This category already exists.");
                          return;
                        }
                        const nextCats = [...categories, val];
                        saveItemsList(items, undefined, undefined, nextCats);
                        input.value = "";
                      }
                    }}
                    className="h-9 px-3 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Add
                  </button>
                </div>
              </div>

              {/* Educational info callout */}
              <div className="bg-indigo-50/55 dark:bg-slate-900/50 border border-indigo-100/60 dark:border-slate-800/80 p-5 rounded-2xl flex items-start gap-3.5">
                <Info className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-550 dark:text-slate-400">
                  <h4 className="font-display font-bold text-indigo-950 dark:text-indigo-400">Volatile Run Notes</h4>
                  <p className="mt-1 leading-relaxed">
                    The checkpoints can be permanently exported above. However, the interactive <span className="font-semibold text-indigo-700 dark:text-indigo-400">remarks & notes</span> typed during execution are session-volatile, keeping audits untampered on successive file loads.
                  </p>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Interactive Checklist Stage (Span 7) */}
            <div className={`flex flex-col gap-6 transition-all duration-300 ${sidebarCollapsed ? "lg:col-span-12" : "lg:col-span-7"}`}>
              
              {/* Checklist toolbar (Filters & Search) */}
              <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 rounded-xl shadow-xs">
                
                {/* Search & Collapse buttons container */}
                <div className="flex items-center gap-3 w-full lg:w-auto">
                  {/* Sidebar Toggle Collapse/Expand Button */}
                  <button
                    id="toggle-sidebar-btn"
                    type="button"
                    onClick={() => {
                      const nextCollapsed = !sidebarCollapsed;
                      setSidebarCollapsed(nextCollapsed);
                      localStorage.setItem("checklist_sidebar_collapsed", String(nextCollapsed));
                    }}
                    className="h-10 px-3 bg-slate-50 hover:bg-slate-100 dark:bg-slate-950 dark:hover:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-600 dark:text-slate-400 flex items-center gap-2 text-xs font-semibold shrink-0 cursor-pointer transition-all"
                    title={sidebarCollapsed ? "Show controls & uploads sidebar" : "Hide controls & uploads sidebar"}
                  >
                    {sidebarCollapsed ? (
                      <>
                        <PanelLeftOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span className="hidden sm:inline">Show Sidebar</span>
                      </>
                    ) : (
                      <>
                        <PanelLeftClose className="w-4 h-4 text-slate-500 dark:text-slate-400" />
                        <span className="hidden sm:inline">Hide Sidebar</span>
                      </>
                    )}
                  </button>

                  {/* Search input field */}
                  <div className="relative flex-1 lg:w-64">
                    <input
                      id="search-tasks-input"
                      type="text"
                      placeholder="Search checklists..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full h-10 pl-9 pr-3 text-sm bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-805 dark:text-slate-150 focus:outline-none focus:ring-1 focus:ring-indigo-500 placeholder-slate-400"
                    />
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                      <Search className="w-3.5 h-3.5" />
                    </div>
                  </div>
                </div>

                {/* Categories filtering bar */}
                <div className="flex items-center gap-2 w-full lg:w-auto flex-wrap py-0.5 lg:justify-end">
                  <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 shrink-0 hidden sm:block" />
                  <div className="flex flex-wrap gap-1.5 justify-start lg:justify-end">
                    {activeCategories.map((cat) => (
                      <button
                        id={`filter-cat-${cat.replace(/\s+/g, '')}`}
                        key={cat}
                        type="button"
                        onClick={() => setSelectedCategory(cat)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-semibold transition-all shrink-0 cursor-pointer ${
                          selectedCategory === cat
                            ? "bg-indigo-600 text-white shadow-xs"
                            : "bg-slate-50 text-slate-500 hover:text-slate-900 dark:bg-slate-950 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Main item lists */}
              <div className="flex flex-col gap-4 min-h-[400px]">
                {filteredItems.length === 0 ? (
                  <div className="flex flex-col items-center justify-center text-center p-12 border border-dashed border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 rounded-2xl flex-1">
                    <div className="p-3 bg-slate-50 dark:bg-slate-850 text-slate-400 rounded-full mb-4">
                      {searchQuery ? (
                        <Search className="w-6 h-6" />
                      ) : (
                        <Layers className="w-6 h-6" />
                      )}
                    </div>
                    <h3 className="text-slate-800 dark:text-slate-200 font-display font-semibold text-sm">
                      {searchQuery ? "No matching audit tasks found" : "Your checklist template folder is empty"}
                    </h3>
                    <p className="text-slate-450 dark:text-slate-500 text-xs mt-1.5 max-w-sm leading-relaxed">
                      {searchQuery 
                        ? "Try matching different keywords or adjusting the category buttons above."
                        : "Create compliance checkpoints by filling out the templates card on the left."
                      }
                    </p>
                    {searchQuery && (
                      <button
                        id="clear-search-btn"
                        onClick={() => { setSearchQuery(""); setSelectedCategory("All"); }}
                        className="mt-4 text-xs font-bold text-indigo-600 hover:text-indigo-700 cursor-pointer"
                      >
                        Clear Filters
                      </button>
                    )}
                  </div>
                ) : (
                  filteredItems.map((item) => {
                    const taskState = taskStates[item.id] || {
                      itemId: item.id,
                      isCompleted: false,
                      note: "",
                      description: "",
                    };

                    return (
                      <ChecklistItemRow
                        key={item.id}
                        item={item}
                        taskState={taskState}
                        onToggleComplete={handleToggleComplete}
                        onUpdateNote={handleUpdateNote}
                        onUpdateDescription={handleUpdateDescription}
                        onUpdateStatus={handleUpdateStatus}
                        onDeleteTemplateItem={handleDeleteTemplateItem}
                        onEditTemplateItem={handleEditTemplateItem}
                      />
                    );
                  })
                )}
              </div>



            </div>

          </div>
          </div>
        )}

      </main>

      {/* Reusable non-blocking custom confirmation and alert modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-slate-950/80 backdrop-blur-xs animate-fade-in print:hidden">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xl animate-scale-in">
            <div className="flex items-start gap-3.5">
              <div className="p-2.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded-xl">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div className="flex-1">
                <h3 className="text-base font-display font-bold text-slate-900 dark:text-white leading-6">
                  {confirmModal.title}
                </h3>
                <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 leading-relaxed font-sans">
                  {confirmModal.message}
                </p>
              </div>
            </div>
            
            <div className="mt-6 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-slate-800 pt-4">
              {confirmModal.showCancel && (
                <button
                  id="modal-cancel-btn"
                  type="button"
                  onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-800 dark:text-slate-200 text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer"
                >
                  Cancel
                </button>
              )}
              <button
                id="modal-confirm-btn"
                type="button"
                onClick={confirmModal.onConfirm}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold uppercase tracking-wider rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                {confirmModal.showCancel ? "Confirm" : "OK"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
