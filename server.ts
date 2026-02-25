import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("metronome.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS presets (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    bpm INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS setlists (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS setlist_presets (
    setlist_id TEXT,
    preset_id TEXT,
    position INTEGER,
    FOREIGN KEY(setlist_id) REFERENCES setlists(id) ON DELETE CASCADE,
    PRIMARY KEY(setlist_id, preset_id, position)
  );
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  
  // Presets
  app.get("/api/presets", (req, res) => {
    const presets = db.prepare("SELECT * FROM presets").all();
    res.json(presets);
  });

  app.post("/api/presets", (req, res) => {
    const { id, name, bpm } = req.body;
    db.prepare("INSERT OR REPLACE INTO presets (id, name, bpm) VALUES (?, ?, ?)").run(id, name, bpm);
    res.json({ success: true });
  });

  app.delete("/api/presets/:id", (req, res) => {
    db.prepare("DELETE FROM presets WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Setlists
  app.get("/api/setlists", (req, res) => {
    const setlists = db.prepare("SELECT * FROM setlists").all();
    const result = setlists.map((s: any) => {
      const presets = db.prepare(`
        SELECT p.* FROM presets p
        JOIN setlist_presets sp ON p.id = sp.preset_id
        WHERE sp.setlist_id = ?
        ORDER BY sp.position ASC
      `).all(s.id);
      return { ...s, presets };
    });
    res.json(result);
  });

  app.post("/api/setlists", (req, res) => {
    const { id, name, presets } = req.body;
    
    const transaction = db.transaction(() => {
      db.prepare("INSERT OR REPLACE INTO setlists (id, name) VALUES (?, ?)").run(id, name);
      db.prepare("DELETE FROM setlist_presets WHERE setlist_id = ?").run(id);
      
      const insertPreset = db.prepare("INSERT INTO setlist_presets (setlist_id, preset_id, position) VALUES (?, ?, ?)");
      presets.forEach((p: any, index: number) => {
        // Ensure preset exists (it might be a copy with a new ID but same data)
        db.prepare("INSERT OR IGNORE INTO presets (id, name, bpm) VALUES (?, ?, ?)").run(p.id, p.name, p.bpm);
        insertPreset.run(id, p.id, index);
      });
    });
    
    transaction();
    res.json({ success: true });
  });

  app.delete("/api/setlists/:id", (req, res) => {
    db.prepare("DELETE FROM setlists WHERE id = ?").run(req.params.id);
    db.prepare("DELETE FROM setlist_presets WHERE setlist_id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
