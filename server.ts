import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI } from "@google/genai";
import { createServer as createViteServer } from "vite";
import dotenv from "dotenv";

// Load env variables
dotenv.config();

const app = express();
const PORT = 3000;

// Increase payload size limits for base64 image uploads
app.use(express.json({ limit: "15mb" }));
app.use(express.urlencoded({ limit: "15mb", extended: true }));

// Ensure data directories exist
const DATA_DIR = path.join(process.cwd(), "data");
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
const ISSUES_FILE = path.join(DATA_DIR, "issues.json");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}
if (!fs.existsSync(ISSUES_FILE)) {
  fs.writeFileSync(ISSUES_FILE, JSON.stringify([], null, 2));
}

// Serve uploaded images statically
app.use("/uploads", express.static(UPLOADS_DIR));

// Helper to read issues
function getIssues() {
  try {
    if (fs.existsSync(ISSUES_FILE)) {
      const data = fs.readFileSync(ISSUES_FILE, "utf-8");
      return JSON.parse(data);
    }
  } catch (error) {
    console.error("Error reading issues file:", error);
  }
  return [];
}

// Helper to write issues
function saveIssues(issues: any[]) {
  try {
    fs.writeFileSync(ISSUES_FILE, JSON.stringify(issues, null, 2), "utf-8");
  } catch (error) {
    console.error("Error writing issues file:", error);
  }
}

// 1. Analyze Photo with Gemini API
app.post("/api/analyze", async (req, res) => {
  try {
    const { image, mimeType } = req.body;

    if (!image || !mimeType) {
      return res.status(400).json({ error: "Image and mimeType are required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined. Falling back to structured mock parsing.");
      // Return structured mock result if API key is not present
      return res.json({
        category: "garbage",
        severity: "medium",
        description: "An accumulation of household and organic waste piled up on the curb, blocking the pedestrian pathway and attracting pests. Needs immediate cleanup."
      });
    }

    // Standardize base64 string (remove prefix if present)
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
    
    const prompt = `You are a professional, helpful civic assistant for "Community Hero", a local app for reporting urban and environmental issues.
Analyze this photo of a civic issue. Identify what category of issue is shown and its severity.
Choose from these exact values:
- category: 'pothole', 'streetlight', 'garbage', 'water_leak', 'other'
- severity: 'low', 'medium', 'high'

Special Classification Rules for distinguishing Potholes vs. Water Leaks when both water and road damage are present:
1. If the water appears to be rising FROM the ground or a pipe itself (e.g., a visible pipe, fountain-like spray, gushing or flowing from a fixed point, or the surrounding road surface looks otherwise dry/intact aside from the leak point), classify as "water_leak" — this points to a burst pipe or sewage issue.
2. If the water is sitting passively inside a damaged or cratered road surface, with no visible pipe or flowing source, and the surroundings look consistent with rain (wet ground generally, overcast conditions, puddles in multiple spots), classify as "pothole" — the standing water is rainwater collecting in existing road damage, not a leak.
3. If genuinely ambiguous, classify as "pothole" by default (since stagnant rainwater in damaged roads is the far more common real-world case), and set severity to "medium" or higher (since stagnant water in potholes is also a safety and mosquito-breeding hazard worth flagging).
4. In the generated description, you MUST briefly state which signal led to your classification (e.g., "visible pipe leak" vs "rainwater pooling in damaged road surface") so a human reviewer can quickly verify the AI's reasoning.

Write a brief, polite, objective, one-paragraph description (2-4 sentences) that clearly describes the problem and incorporates the classification reasoning signal. Do not exaggerate.

You must reply with a valid JSON object matching this schema:
{
  "category": "pothole" | "streetlight" | "garbage" | "water_leak" | "other",
  "severity": "low" | "medium" | "high",
  "description": "string"
}

Do not include any explanation, markdown block formatting, or extra text. Return ONLY the JSON object itself.`;

    let response;
    const modelsToTry = [
      "gemini-3.5-flash",
      "gemini-3.1-flash-lite",
      "gemini-2.5-flash"
    ];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting image analysis with model: ${modelName}...`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    data: base64Data,
                    mimeType: mimeType,
                  },
                },
                {
                  text: prompt,
                },
              ],
            },
          ],
          config: {
            responseMimeType: "application/json",
          },
        });
        if (response && response.text) {
          console.log(`Successfully analyzed image using model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed with error:`, err.message || err);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All Gemini models failed to analyze the image.");
    }

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    const parsed = JSON.parse(responseText.trim());
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error analyzing image with Gemini API:", error);
    // Return status 200 with fallback data so the client-side fallback parsing is triggered smoothly without throwing a blocking fetch exception.
    return res.json({
      error: "Failed to analyze image with AI due to service demand. Applied standard fallback classification.",
      details: error.message || error,
      fallback: {
        category: "other",
        severity: "medium",
        description: "Community report uploaded. Visual inspection pending. The user's uploaded photo indicates a potential civic issue that needs to be assessed by a neighborhood inspector."
      }
    });
  }
});

// 1.5. Upload base64 photo to server disk and return public path
app.post("/api/upload", (req, res) => {
  try {
    const { image, mimeType } = req.body;
    if (!image || !mimeType) {
      return res.status(400).json({ error: "Image and mimeType are required." });
    }
    const base64Data = image.replace(/^data:image\/\w+;base64,/, "");
    const extension = mimeType.split("/")[1] || "png";
    const fileName = `issue_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;
    const filePath = path.join(UPLOADS_DIR, fileName);
    
    fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
    return res.json({ photoUrl: `/uploads/${fileName}` });
  } catch (err: any) {
    console.error("Upload error:", err);
    return res.status(500).json({ error: "Failed to upload image.", details: err.message });
  }
});

// 2. Submit a new civic issue
app.post("/api/issues", async (req, res) => {
  try {
    const {
      photoData, // base64 representation to save locally
      mimeType,
      category,
      severity,
      description,
      location, // { address: string, lat?: number, lng?: number }
      reporter, // { uid: string, displayName: string, email: string, photoURL?: string }
      note
    } = req.body;

    if (!category || !severity || !description || !location || !location.address) {
      return res.status(400).json({ error: "Required fields are missing." });
    }

    let finalPhotoUrl = "/assets/placeholder-issue.png"; // fallback

    // Save base64 image to server disk
    if (photoData && mimeType) {
      const base64Data = photoData.replace(/^data:image\/\w+;base64,/, "");
      const extension = mimeType.split("/")[1] || "png";
      const fileName = `issue_${Date.now()}_${Math.floor(Math.random() * 1000)}.${extension}`;
      const filePath = path.join(UPLOADS_DIR, fileName);
      
      fs.writeFileSync(filePath, Buffer.from(base64Data, "base64"));
      finalPhotoUrl = `/uploads/${fileName}`;
    }

    const newIssue = {
      id: `issue_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
      photoUrl: finalPhotoUrl,
      category,
      severity,
      description,
      location: {
        address: location.address,
        lat: Number(location.lat) || 40.7128, // Default to a standard point if blank
        lng: Number(location.lng) || -74.0060
      },
      status: "Open", // default status
      reporterId: reporter?.uid || "anonymous_user",
      reporterName: reporter?.displayName || "Community Member",
      reporterEmail: reporter?.email || "anonymous@communityhero.org",
      reporterPhoto: reporter?.photoURL || "",
      note: note || "",
      timestamp: new Date().toISOString(),
      comments: []
    };

    const currentIssues = getIssues();
    currentIssues.unshift(newIssue); // newest first
    saveIssues(currentIssues);

    return res.status(201).json(newIssue);
  } catch (error: any) {
    console.error("Error creating issue:", error);
    return res.status(500).json({ error: "Failed to submit issue", details: error.message });
  }
});

// 3. Browse all issues
app.get("/api/issues", (req, res) => {
  try {
    const issues = getIssues();
    return res.json(issues);
  } catch (error) {
    return res.status(500).json({ error: "Failed to read issues" });
  }
});

// 4. Update issue status or details (useful for simulated administrative actions!)
app.patch("/api/issues/:id", (req, res) => {
  try {
    const { id } = req.params;
    const { status, note, category, severity, description } = req.body;

    const issues = getIssues();
    const index = issues.findIndex((i: any) => i.id === id);

    if (index === -1) {
      return res.status(404).json({ error: "Issue not found" });
    }

    const updatedIssue = { ...issues[index] };
    if (status) updatedIssue.status = status;
    if (note !== undefined) updatedIssue.note = note;
    if (category) updatedIssue.category = category;
    if (severity) updatedIssue.severity = severity;
    if (description) updatedIssue.description = description;

    issues[index] = updatedIssue;
    saveIssues(issues);

    return res.json(updatedIssue);
  } catch (error) {
    return res.status(500).json({ error: "Failed to update issue" });
  }
});

// 5. Delete issue (optional administrative cleanup)
app.delete("/api/issues/:id", (req, res) => {
  try {
    const { id } = req.params;
    let issues = getIssues();
    const exists = issues.some((i: any) => i.id === id);
    if (!exists) {
      return res.status(404).json({ error: "Issue not found" });
    }
    issues = issues.filter((i: any) => i.id !== id);
    saveIssues(issues);
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: "Failed to delete issue" });
  }
});

// 6. Get stats summary
app.get("/api/stats", (req, res) => {
  try {
    const issues = getIssues();
    const stats = {
      total: issues.length,
      byCategory: {
        pothole: 0,
        streetlight: 0,
        garbage: 0,
        water_leak: 0,
        other: 0,
      },
      byStatus: {
        Open: 0,
        "In Progress": 0,
        Resolved: 0,
      },
      bySeverity: {
        low: 0,
        medium: 0,
        high: 0,
      }
    };

    issues.forEach((issue: any) => {
      // Safely count category
      const cat = issue.category;
      if (cat in stats.byCategory) {
        stats.byCategory[cat as keyof typeof stats.byCategory]++;
      } else {
        stats.byCategory.other++;
      }

      // Safely count status
      const status = issue.status || "Open";
      if (status in stats.byStatus) {
        stats.byStatus[status as keyof typeof stats.byStatus]++;
      } else {
        stats.byStatus.Open++;
      }

      // Safely count severity
      const sev = issue.severity || "medium";
      if (sev in stats.bySeverity) {
        stats.bySeverity[sev as keyof typeof stats.bySeverity]++;
      } else {
        stats.bySeverity.medium++;
      }
    });

    return res.json(stats);
  } catch (error) {
    return res.status(500).json({ error: "Failed to get statistics" });
  }
});

const POTHOLE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
  <rect width="600" height="400" fill="#1e293b"/>
  <path d="M 0 200 L 600 200" stroke="#475569" stroke-width="120"/>
  <path d="M 0 200 L 600 200" stroke="#e2e8f0" stroke-width="4" stroke-dasharray="30 30"/>
  <ellipse cx="300" cy="200" rx="90" ry="40" fill="#0f172a" stroke="#ef4444" stroke-width="4"/>
  <path d="M 210 200 L 170 210 L 150 205 M 390 200 L 430 190 L 450 195 M 300 160 L 310 120 L 305 100 M 300 240 L 290 270 L 295 290" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
  <polygon points="100,80 130,130 70,130" fill="#f59e0b" stroke="#ffffff" stroke-width="2"/>
  <text x="100" y="122" fill="#000000" font-family="sans-serif" font-size="28" font-weight="extrabold" text-anchor="middle">!</text>
  <rect x="0" y="330" width="600" height="70" fill="#0f172a" opacity="0.9"/>
  <text x="20" y="370" fill="#38bdf8" font-family="sans-serif" font-size="18" font-weight="bold">MUMBAI HIGHWAY (NH-48)</text>
  <text x="580" y="370" fill="#ef4444" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="end">PWD REPORT</text>
</svg>`;

const STREETLIGHT_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
  <rect width="600" height="400" fill="#090d16"/>
  <circle cx="80" cy="70" r="1.5" fill="#ffffff" opacity="0.8"/>
  <circle cx="180" cy="110" r="1.5" fill="#ffffff" opacity="0.5"/>
  <circle cx="450" cy="80" r="1.5" fill="#ffffff" opacity="0.9"/>
  <circle cx="520" cy="140" r="2" fill="#ffffff" opacity="0.7"/>
  <path d="M 400 400 L 400 120 Q 400 80 360 80" fill="none" stroke="#334155" stroke-width="12" stroke-linecap="round"/>
  <rect x="310" y="72" width="60" height="18" rx="5" fill="#475569" transform="rotate(-15, 340, 81)"/>
  <ellipse cx="325" cy="92" rx="14" ry="10" fill="#1e293b" stroke="#ef4444" stroke-width="2"/>
  <path d="M 325 102 L 320 115 L 328 122" fill="none" stroke="#f59e0b" stroke-width="2" opacity="0.3"/>
  <path d="M 315 85 L 335 99 M 335 85 L 315 99" stroke="#ef4444" stroke-width="3" stroke-linecap="round"/>
  <path d="M 0 400 L 0 280 L 80 230 L 160 280 L 160 400 Z" fill="#0f172a"/>
  <path d="M 160 400 L 160 310 L 210 270 L 260 310 L 260 400 Z" fill="#111827"/>
  <rect x="50" y="300" width="25" height="35" rx="2" fill="#f59e0b" opacity="0.75"/>
  <rect x="195" y="330" width="20" height="25" rx="2" fill="#f59e0b" opacity="0.5"/>
  <rect x="0" y="330" width="600" height="70" fill="#0f172a" opacity="0.9"/>
  <text x="20" y="370" fill="#38bdf8" font-family="sans-serif" font-size="18" font-weight="bold">LAJPAT NAGAR, NEW DELHI</text>
  <text x="580" y="370" fill="#eab308" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="end">BESCOM REPORT</text>
</svg>`;

const GARBAGE_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
  <rect width="600" height="400" fill="#1e293b"/>
  <rect width="600" height="180" fill="#111827"/>
  <rect x="420" y="40" width="130" height="360" fill="#1e293b" stroke="#334155" stroke-width="2"/>
  <rect x="440" y="70" width="15" height="20" fill="#f59e0b" opacity="0.8"/>
  <rect x="480" y="70" width="15" height="20" fill="#1e293b"/>
  <rect x="510" y="70" width="15" height="20" fill="#f59e0b" opacity="0.4"/>
  <rect x="440" y="110" width="15" height="20" fill="#1e293b"/>
  <rect x="480" y="110" width="15" height="20" fill="#f59e0b" opacity="0.9"/>
  <rect x="510" y="110" width="15" height="20" fill="#1e293b"/>
  <rect x="440" y="150" width="15" height="20" fill="#f59e0b" opacity="0.7"/>
  <rect x="480" y="150" width="15" height="20" fill="#1e293b"/>
  <rect x="510" y="150" width="15" height="20" fill="#f59e0b" opacity="0.6"/>
  <rect x="440" y="190" width="15" height="20" fill="#1e293b"/>
  <rect x="480" y="190" width="15" height="20" fill="#f59e0b" opacity="0.5"/>
  <rect x="510" y="190" width="15" height="20" fill="#1e293b"/>
  <path d="M 50 360 C 120 220, 280 200, 360 360 Z" fill="#4b5320" stroke="#2d3748" stroke-width="3"/>
  <rect x="120" y="270" width="130" height="35" rx="4" fill="#64748b" transform="rotate(-15, 120, 270)" stroke="#1e293b" stroke-width="2"/>
  <line x1="125" y1="270" x2="235" y2="240" stroke="#475569" stroke-width="2"/>
  <circle cx="80" cy="330" r="28" fill="#0f172a" stroke="#334155" stroke-width="2"/>
  <circle cx="280" cy="320" r="32" fill="#020617" stroke="#1e293b" stroke-width="2"/>
  <circle cx="320" cy="340" r="22" fill="#334155"/>
  <circle cx="160" cy="180" r="2" fill="#000" opacity="0.8"/>
  <circle cx="170" cy="190" r="1.5" fill="#000" opacity="0.8"/>
  <circle cx="150" cy="195" r="2" fill="#000" opacity="0.8"/>
  <path d="M 160 176 L 164 172 M 160 176 L 156 172" stroke="#64748b" stroke-width="1"/>
  <rect x="0" y="330" width="600" height="70" fill="#0f172a" opacity="0.9"/>
  <text x="20" y="370" fill="#38bdf8" font-family="sans-serif" font-size="18" font-weight="bold">OUTER RING ROAD, BENGALURU</text>
  <text x="580" y="370" fill="#eab308" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="end">MUNICIPAL CORP</text>
</svg>`;

const WATER_LEAK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 400">
  <rect width="600" height="400" fill="#1e293b"/>
  <ellipse cx="300" cy="270" rx="220" ry="80" fill="#0369a1" opacity="0.4" stroke="#0ea5e9" stroke-width="2"/>
  <ellipse cx="280" cy="280" rx="150" ry="50" fill="#0284c7" opacity="0.5" stroke="#38bdf8" stroke-width="1.5"/>
  <ellipse cx="320" cy="260" rx="80" ry="30" fill="#38bdf8" opacity="0.3"/>
  <rect x="250" y="220" width="100" height="50" rx="10" fill="#475569" stroke="#94a3b8" stroke-width="4"/>
  <path d="M 300 230 C 270 120, 240 70, 180 120" fill="none" stroke="#7dd3fc" stroke-width="5" stroke-linecap="round" opacity="0.9"/>
  <path d="M 300 230 C 330 110, 360 60, 420 100" fill="none" stroke="#e0f2fe" stroke-width="6" stroke-linecap="round" opacity="0.85"/>
  <path d="M 300 230 Q 300 50 310 40" fill="none" stroke="#bae6fd" stroke-width="4" stroke-linecap="round" opacity="0.95"/>
  <circle cx="160" cy="130" r="4" fill="#bae6fd"/>
  <circle cx="430" cy="115" r="5" fill="#e0f2fe"/>
  <circle cx="312" cy="30" r="3" fill="#ffffff"/>
  <rect x="0" y="330" width="600" height="70" fill="#0f172a" opacity="0.9"/>
  <text x="20" y="370" fill="#38bdf8" font-family="sans-serif" font-size="18" font-weight="bold">T. NAGAR, CHENNAI</text>
  <text x="580" y="370" fill="#ef4444" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="end">JAL BOARD REPORT</text>
</svg>`;

const getSvgDataUrl = (svg: string) => "data:image/svg+xml;utf8," + encodeURIComponent(svg);

// Seeding standard civic issues if database is empty, to make the dashboard and feed look fantastic immediately!
const SEED_ISSUES = [
  {
    id: "seed_1",
    photoUrl: getSvgDataUrl(WATER_LEAK_SVG),
    category: "water_leak",
    severity: "high",
    description: "Water leakage in Chennai street: A major water pipe burst near GN Chetty Road, T. Nagar. Drinking water is bubbling up through the road pavement, creating a deep pool and threatening nearby residential basements.",
    location: {
      address: "GN Chetty Road, T. Nagar, Chennai, Tamil Nadu 600017",
      lat: 13.0418,
      lng: 80.2337
    },
    status: "In Progress",
    reporterId: "seed_user_1",
    reporterName: "Saroja Srinivasan",
    reporterEmail: "saroja.s@bharat-civic.org",
    reporterPhoto: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    note: "Reporting this early in the morning. Water flow is very strong, the whole street corner is submerged. Routed to Jal Board.",
    timestamp: new Date(Date.now() - 3600000 * 4).toISOString(), // 4 hours ago
  },
  {
    id: "seed_2",
    photoUrl: getSvgDataUrl(POTHOLE_SVG),
    category: "pothole",
    severity: "high",
    description: "Pothole on Mumbai highway: Deep, jagged pothole in the middle of the eastbound lane on Western Express Highway, Malad. Multiple cars and two-wheelers have had to swerve dangerously into the oncoming lane to avoid hitting it.",
    location: {
      address: "Western Express Highway, Malad East, Mumbai, Maharashtra 400097",
      lat: 19.1648,
      lng: 72.8493
    },
    status: "Open",
    reporterId: "seed_user_2",
    reporterName: "Milind Jadav",
    reporterEmail: "milind.j@my-neighborhood.net",
    reporterPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    note: "Almost blew my tire here. It's about 6 inches deep! Routed to PWD (Public Works Department).",
    timestamp: new Date(Date.now() - 3600000 * 24).toISOString(), // 24 hours ago
  },
  {
    id: "seed_3",
    photoUrl: getSvgDataUrl(GARBAGE_SVG),
    category: "garbage",
    severity: "medium",
    description: "Garbage pile near Bangalore apartment: Illegally dumped garbage, plastic waste, and household waste piled on the sidewalk corner of Outer Ring Road, HSR Layout, near the apartment gate.",
    location: {
      address: "Outer Ring Road, HSR Layout, Bengaluru, Karnataka 560102",
      lat: 12.9279,
      lng: 77.6271
    },
    status: "Open",
    reporterId: "seed_user_3",
    reporterName: "Esha Reddy",
    reporterEmail: "esha.r@eco-action.org",
    reporterPhoto: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=150",
    note: "This pile has been growing since Tuesday. Pests are starting to gather. Routed to Municipal Corporation.",
    timestamp: new Date(Date.now() - 3600000 * 48).toISOString(), // 2 days ago
  },
  {
    id: "seed_4",
    photoUrl: getSvgDataUrl(STREETLIGHT_SVG),
    category: "streetlight",
    severity: "low",
    description: "Broken streetlight in Delhi colony: The street lamp outside Lajpat Nagar III has completely gone dark, leaving the pedestrian crosswalk unlit and unsafe.",
    location: {
      address: "Lajpat Nagar III, New Delhi, Delhi 110024",
      lat: 28.5672,
      lng: 77.2433
    },
    status: "Resolved",
    reporterId: "seed_user_2",
    reporterName: "Milind Jadav",
    reporterEmail: "milind.j@my-neighborhood.net",
    reporterPhoto: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    note: "Pitch black at night now, makes returning from the metro station quite uncomfortable. Fixed by BESCOM.",
    timestamp: new Date(Date.now() - 3600000 * 96).toISOString(), // 4 days ago
  }
];

// Seed databases if empty
const currentIssues = getIssues();
if (currentIssues.length === 0) {
  saveIssues(SEED_ISSUES);
  console.log("Seeded database with initial civic issues.");
}

// Vite middleware configuration for development vs static asset serving for production
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
