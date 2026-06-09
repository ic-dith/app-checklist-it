import express from "express";
import path from "path";
import fs from "fs";
import AdmZip from "adm-zip";

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

  // Use JSON body parser for API requests
  app.use(express.json({ limit: "15mb" }));

  // API Endpoint to load checklist XML files directly from disk
  app.get("/api/load-checklist", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    try {
      const projectRoot = process.cwd();
      const presetsXmlPath = path.join(projectRoot, "src", "checklist_presets.xml");
      const configXmlPath = path.join(projectRoot, "src", "app_config.xml");
      const categoriesXmlPath = path.join(projectRoot, "src", "categories.xml");

      let presetsXml = "";
      let configXml = "";
      let categoriesXml = "";

      if (fs.existsSync(presetsXmlPath)) {
        presetsXml = fs.readFileSync(presetsXmlPath, "utf8");
      }
      if (fs.existsSync(configXmlPath)) {
        configXml = fs.readFileSync(configXmlPath, "utf8");
      }
      if (fs.existsSync(categoriesXmlPath)) {
        categoriesXml = fs.readFileSync(categoriesXmlPath, "utf8");
      } else {
        // Auto-initialize categories table if not present for some reason
        categoriesXml = `<?xml version="1.0" encoding="UTF-8"?>\n<categories>\n  <category>General</category>\n  <category>Daily Routine</category>\n  <category>Work &amp; Tech</category>\n  <category>Health &amp; Wellness</category>\n  <category>Travel &amp; Packing</category>\n</categories>\n`;
        fs.writeFileSync(categoriesXmlPath, categoriesXml, "utf8");
      }

      return res.json({
        presetsXml,
        configXml,
        categoriesXml,
      });
    } catch (err: any) {
      console.error("[Server] Error loading checklist from disk:", err);
      return res.status(500).json({ error: "Failed to read XML files from server disk: " + err.message });
    }
  });

  // API Endpoint to stream XML presets file with download headers so that downloads work inside iframe
  app.get("/api/download-checklist", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    try {
      const projectRoot = process.cwd();
      const presetsXmlPath = path.join(projectRoot, "src", "checklist_presets.xml");
      if (fs.existsSync(presetsXmlPath)) {
        res.setHeader("Content-Disposition", "attachment; filename=checklist_presets.xml");
        res.setHeader("Content-Type", "text/xml");
        const fileContent = fs.readFileSync(presetsXmlPath, "utf8");
        return res.send(fileContent);
      } else {
        return res.status(404).send("Checklist XML file not found on disk.");
      }
    } catch (err: any) {
      console.error("[Server] Error downloading file:", err);
      return res.status(500).send("Error downloading file: " + err.message);
    }
  });

  // API Endpoint to stream categories XML file
  app.get("/api/download-categories", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    try {
      const projectRoot = process.cwd();
      const categoriesXmlPath = path.join(projectRoot, "src", "categories.xml");
      if (fs.existsSync(categoriesXmlPath)) {
        res.setHeader("Content-Disposition", "attachment; filename=categories.xml");
        res.setHeader("Content-Type", "text/xml");
        const fileContent = fs.readFileSync(categoriesXmlPath, "utf8");
        return res.send(fileContent);
      } else {
        return res.status(404).send("Categories XML file not found on disk.");
      }
    } catch (err: any) {
      console.error("[Server] Error downloading categories:", err);
      return res.status(500).send("Error downloading categories: " + err.message);
    }
  });

  // API Endpoint to stream config XML file
  app.get("/api/download-config", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    try {
      const projectRoot = process.cwd();
      const configXmlPath = path.join(projectRoot, "src", "app_config.xml");
      if (fs.existsSync(configXmlPath)) {
        res.setHeader("Content-Disposition", "attachment; filename=app_config.xml");
        res.setHeader("Content-Type", "text/xml");
        const fileContent = fs.readFileSync(configXmlPath, "utf8");
        return res.send(fileContent);
      } else {
        return res.status(404).send("Config XML file not found on disk.");
      }
    } catch (err: any) {
      console.error("[Server] Error downloading configuration:", err);
      return res.status(500).send("Error downloading configuration: " + err.message);
    }
  });

  // API Endpoint to download all three XML files in a single ZIP archive
  app.get("/api/download-all-zip", (req, res) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    try {
      const projectRoot = process.cwd();
      const presetsPath = path.join(projectRoot, "src", "checklist_presets.xml");
      const configPath = path.join(projectRoot, "src", "app_config.xml");
      const categoriesPath = path.join(projectRoot, "src", "categories.xml");

      const zip = new AdmZip();
      let hasFiles = false;

      if (fs.existsSync(presetsPath)) {
        zip.addLocalFile(presetsPath);
        hasFiles = true;
      }
      if (fs.existsSync(configPath)) {
        zip.addLocalFile(configPath);
        hasFiles = true;
      }
      if (fs.existsSync(categoriesPath)) {
        zip.addLocalFile(categoriesPath);
        hasFiles = true;
      }

      if (!hasFiles) {
        return res.status(404).send("No XML configuration files found on the server to package.");
      }

      const zipBuffer = zip.toBuffer();
      res.setHeader("Content-Disposition", "attachment; filename=checklist_core_xmls.zip");
      res.setHeader("Content-Type", "application/zip");
      return res.send(zipBuffer);
    } catch (err: any) {
      console.error("[Server] Error bundling XML ZIP archive:", err);
      return res.status(500).send("Error bundling XML files: " + err.message);
    }
  });

  // API Endpoint to save checklist items and config XML files back to the project on the server
  app.post("/api/save-checklist", async (req, res) => {
    try {
      const { items, title, subtitle, categories } = req.body;

      if (!items || !Array.isArray(items)) {
        return res.status(400).json({ error: "Invalid payload: 'items' array is required." });
      }

      // 1. Build the updated checklist XML representation
      const safeTitle = (title || "ClearTask Compliance")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
      const safeSubtitle = (subtitle || "Operational Safety Checklist Template & Audit")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");

      let checklistXmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<checklist>\n`;
      checklistXmlContent += `  <title>${safeTitle}</title>\n`;
      checklistXmlContent += `  <subtitle>${safeSubtitle}</subtitle>\n`;
      
      items.forEach((item: any) => {
        const id = item.id || `item-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        const text = (item.text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const category = (item.category || "General").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        const description = (item.description || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        
        checklistXmlContent += `  <item>\n`;
        checklistXmlContent += `    <id>${id}</id>\n`;
        checklistXmlContent += `    <text>${text}</text>\n`;
        checklistXmlContent += `    <category>${category}</category>\n`;
        checklistXmlContent += `    <description>${description}</description>\n`;
        checklistXmlContent += `  </item>\n`;
      });
      checklistXmlContent += `</checklist>\n`;

      // 2. Build the updated app config XML representation
      const configXmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<config>\n  <title>${safeTitle}</title>\n  <subtitle>${safeSubtitle}</subtitle>\n</config>\n`;

      // 3. Write files synchronously with absolute safety to absolute filesystem locations
      const projectRoot = process.cwd();
      const presetsXmlPath = path.join(projectRoot, "src", "checklist_presets.xml");
      const presetsRawTsPath = path.join(projectRoot, "src", "checklist_presets_xml_raw.ts");
      const configXmlPath = path.join(projectRoot, "src", "app_config.xml");
      const configRawTsPath = path.join(projectRoot, "src", "app_config_xml_raw.ts");

      // Write .xml files
      fs.writeFileSync(presetsXmlPath, checklistXmlContent, "utf8");
      fs.writeFileSync(configXmlPath, configXmlContent, "utf8");

      // Write corresponding ES raw TS files
      const presetsRawContent = `export const PRESETS_XML_RAW = \`${checklistXmlContent.replace(/`/g, "\\`").trim()}\`;\n`;
      const configRawContent = `export const APP_CONFIG_XML_RAW = \`${configXmlContent.replace(/`/g, "\\`").trim()}\`;\n`;

      fs.writeFileSync(presetsRawTsPath, presetsRawContent, "utf8");
      fs.writeFileSync(configRawTsPath, configRawContent, "utf8");

      // 4. Save categories XML representation if provided
      if (categories && Array.isArray(categories)) {
        let categoriesXmlContent = `<?xml version="1.0" encoding="UTF-8"?>\n<categories>\n`;
        categories.forEach((cat: string) => {
          const safeCat = cat.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
          categoriesXmlContent += `  <category>${safeCat}</category>\n`;
        });
        categoriesXmlContent += `</categories>\n`;

        const categoriesXmlPath = path.join(projectRoot, "src", "categories.xml");
        const categoriesRawTsPath = path.join(projectRoot, "src", "categories_xml_raw.ts");

        fs.writeFileSync(categoriesXmlPath, categoriesXmlContent, "utf8");
        const categoriesRawContent = `export const CATEGORIES_XML_RAW = \`${categoriesXmlContent.replace(/`/g, "\\`").trim()}\`;\n`;
        fs.writeFileSync(categoriesRawTsPath, categoriesRawContent, "utf8");
      }

      console.log(`[Server] XML Checklist Presets, Configuration, and Categories saved successfully in Project workspace.`);
      return res.json({ 
          success: true, 
          message: "Successfully synchronized XML configuration with the workspace disk file system!",
          presetsXmlUpdated: presetsXmlPath,
          configUpdated: configXmlPath
      });
    } catch (err: any) {
      console.error("[Server] Error saving updated checklist to files:", err);
      return res.status(500).json({ error: "Failed to persist XML changes to disk: " + err.message });
    }
  });

  const currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();

  // Highlight production mode based on environments, build artifacts, or lack of source files
  const isProduction = 
    process.env.NODE_ENV === "production" || 
    !fs.existsSync(path.join(process.cwd(), "server.ts")) || 
    fs.existsSync(path.join(currentDir, "index.html")) ||
    fs.existsSync(path.join(process.cwd(), "dist", "index.html"));

  if (!isProduction) {
    console.log("[Server] Starting in DEVELOPMENT mode with Vite Middleware.");
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    console.log("[Server] Starting in PRODUCTION mode serving static assets.");
    // Elegant fallback to locate production static assets
    let distPath = path.join(process.cwd(), "dist");
    if (!fs.existsSync(distPath) || !fs.existsSync(path.join(distPath, "index.html"))) {
      if (fs.existsSync(path.join(currentDir, "index.html"))) {
        distPath = currentDir;
      }
    }
    
    console.log(`[Server] Serving static assets from: ${distPath}`);
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Checklist app running on HTTP server: http://localhost:${PORT}`);
  });
}

startServer();
