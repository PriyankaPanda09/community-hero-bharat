import express from "express";
import path from "path";
import fs from "fs";
import { GoogleGenAI, Type } from "@google/genai";
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

// Robust JSON parsing utility to clean up any markdown wrappers or trailing texts from LLM outputs
function parseRobustJSON(text: string): any {
  let clean = text.trim();
  
  // Try direct parse first
  try {
    return JSON.parse(clean);
  } catch (e) {
    // Ignore and try cleaning
  }

  // Remove markdown block if present (both at start and end)
  if (clean.startsWith("```")) {
    clean = clean.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  }

  // Try parsing cleaned text
  try {
    return JSON.parse(clean);
  } catch (e) {
    // Ignore and try deep extract
  }

  // Deep extract: find first '{' or '[' and corresponding or last '}' or ']'
  const firstBrace = clean.indexOf("{");
  const firstBracket = clean.indexOf("[");
  
  let start = -1;
  let end = -1;
  
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = clean.lastIndexOf("}");
  } else if (firstBracket !== -1) {
    start = firstBracket;
    end = clean.lastIndexOf("]");
  }

  if (start !== -1 && end !== -1 && end > start) {
    const jsonCandidate = clean.substring(start, end + 1);
    try {
      return JSON.parse(jsonCandidate);
    } catch (e) {
      console.error("Deep extract failed to parse JSON:", e);
    }
  }

  throw new Error("Unable to parse valid JSON from model response.");
}

// 0.5. Check Realism of Photo with Gemini API
app.post("/api/check-realism", async (req, res) => {
  try {
    const { image, mimeType } = req.body;

    if (!image || !mimeType) {
      return res.status(400).json({ error: "Image and mimeType are required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY environment variable is not defined. Bypassing realism check.");
      return res.json({
        isRealPhoto: true,
        reasoning: "AI realism check bypassed due to missing API key."
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

    const prompt = `You are a strict and highly accurate visual quality auditor for a civic reporting app.
Examine this image carefully. You must determine if it is a real, actual photograph of a physical location (such as a real street, road, building, trash pile, light pole, pipe, etc.) captured with a camera, or if it is some other form of non-photographic content.

Identify as NOT a real photograph (isRealPhoto = false) if it is:
- A cartoon, anime, or manga style illustration
- A sketch, painting, drawing, or digital illustration
- Clip art, icons, or logos
- A stock vector graphic, chart, or design layout
- A computer-generated 3D model, CAD rendering, or video game screenshot
- Text-heavy images, flyers, posters, or digital screenshots of text/websites
- Any other non-photographic representation.

Real photographs of real-world scenes must pass this check (isRealPhoto = true).

You must reply with a valid JSON object matching this schema:
{
  "isRealPhoto": boolean,
  "reasoning": "A short explanation of your judgment (1-2 sentences)."
}

Do not include any explanation, markdown block formatting, or extra text. Return ONLY the JSON object itself.`;

    let response;
    const modelsToTry = [
      "gemini-3.5-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite"
    ];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting realism check with model: ${modelName}...`);
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
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                isRealPhoto: {
                  type: Type.BOOLEAN,
                  description: "True if the image is a real photograph of a physical location, false if it is a cartoon, illustration, clip art, stock graphic, AI-generated/rendered image, screenshot, or non-photographic content."
                },
                reasoning: {
                  type: Type.STRING,
                  description: "A short, clear explanation of why the image was judged as a real photograph or not."
                }
              },
              required: ["isRealPhoto", "reasoning"]
            }
          },
        });
        if (response && response.text) {
          console.log(`Successfully checked realism using model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} realism check failed with error:`, err.message || err);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All Gemini models failed the realism check.");
    }

    const responseText = response.text.trim();
    const parsed = parseRobustJSON(responseText);
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error checking image realism:", error);
    return res.json({
      isRealPhoto: true,
      reasoning: "Failed to verify realism due to service demand. Proceeding by default."
    });
  }
});

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
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.5-flash"
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

    const parsed = parseRobustJSON(responseText);
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

// 1.2. Check for Duplicates using Gemini API
app.post("/api/check-duplicate", async (req, res) => {
  try {
    const { category, newDescription, existingDescription } = req.body;

    if (!category || !newDescription || !existingDescription) {
      return res.status(400).json({ error: "Missing required fields." });
    }

    // Case-insensitive text-based matching (converting both sides to lowercase before comparison)
    const cleanNewDesc = newDescription.trim().toLowerCase();
    const cleanExistingDesc = existingDescription.trim().toLowerCase();

    if (cleanNewDesc === cleanExistingDesc || 
        (cleanNewDesc.includes(cleanExistingDesc) && cleanExistingDesc.length > 5) || 
        (cleanExistingDesc.includes(cleanNewDesc) && cleanNewDesc.length > 5)) {
      return res.json({
        is_duplicate: true,
        confidence: "high",
        reasoning: "The reports contain matching or highly similar descriptions (case-insensitive check), indicating they describe the same civic issue."
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. Bypassing duplicate check.");
      return res.json({
        is_duplicate: false,
        confidence: "low",
        reasoning: "AI duplicate check is temporarily disabled."
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = `You are a civic duplicate detection assistant. Your job is to compare a new report of a civic issue against an existing report of a civic issue of the same category at the same location, and determine if they are likely describing the exact same real-world physical event or issue.

Existing issue description:
"${existingDescription}"

New issue description:
"${newDescription}"

Category: ${category}

Evaluate if the new report is a duplicate of the existing report. Consider details, severity, specific symptoms, and context mentioned in both descriptions.
Reply with a JSON object matching this schema:
{
  "is_duplicate": boolean,
  "confidence": "low" | "medium" | "high",
  "reasoning": "A brief explanation of why this decision was made."
}`;

    let response;
    const modelsToTry = [
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.5-flash"
    ];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting duplicate check with model: ${modelName}...`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                is_duplicate: {
                  type: Type.BOOLEAN,
                  description: "True if the reports refer to the exact same physical issue."
                },
                confidence: {
                  type: Type.STRING,
                  enum: ["low", "medium", "high"],
                  description: "Confidence in the decision."
                },
                reasoning: {
                  type: Type.STRING,
                  description: "Reasoning for the decision."
                }
              },
              required: ["is_duplicate", "confidence", "reasoning"]
            }
          },
        });
        if (response && response.text) {
          console.log(`Successfully checked duplicate using model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed duplicate check with error:`, err.message || err);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All Gemini models failed the duplicate check.");
    }

    const responseText = response.text.trim();
    const parsed = parseRobustJSON(responseText);
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error in duplicate checking:", error);
    return res.json({
      is_duplicate: false,
      confidence: "low",
      reasoning: "Duplicate check failed due to server error: " + (error.message || error)
    });
  }
});

// Helper to fetch remote image and convert to base64
async function fetchImageAsBase64(url: string): Promise<{ data: string; mimeType: string } | null> {
  try {
    if (url.startsWith("data:image/")) {
      const match = url.match(/^data:(image\/\w+);base64,(.+)$/);
      if (match) {
        return { mimeType: match[1], data: match[2] };
      }
    }
    if (url.startsWith("http://") || url.startsWith("https://")) {
      const response = await fetch(url);
      if (!response.ok) return null;
      const buffer = await response.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const contentType = response.headers.get("content-type") || "image/jpeg";
      return { mimeType: contentType, data: base64 };
    }
  } catch (error) {
    console.error("Error fetching remote image for verification:", error);
  }
  return null;
}

// 1.25. Verify Confirmation Photo using Gemini API
app.post("/api/verify-confirmation", async (req, res) => {
  try {
    const { existingPhotoUrl, existingDescription, newPhotoBase64, newPhotoMimeType } = req.body;

    if (!existingDescription || !newPhotoBase64 || !newPhotoMimeType) {
      return res.status(400).json({ error: "Missing required fields: existingDescription, newPhotoBase64, and newPhotoMimeType are required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. Bypassing verification check.");
      return res.json({
        matches: true,
        confidence: "low",
        reasoning: "AI photo verification is temporarily disabled."
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Standardize base64 string for new confirmation photo
    const standardizedNewPhoto = newPhotoBase64.replace(/^data:image\/\w+;base64,/, "");

    const parts: any[] = [];

    // If an existing photo exists, try to fetch it and include it
    let fetchedExistingPhoto: { data: string; mimeType: string } | null = null;
    if (existingPhotoUrl) {
      fetchedExistingPhoto = await fetchImageAsBase64(existingPhotoUrl);
    }

    if (fetchedExistingPhoto) {
      parts.push({
        inlineData: {
          data: fetchedExistingPhoto.data,
          mimeType: fetchedExistingPhoto.mimeType,
        },
      });
      parts.push({ text: "Above is the ORIGINAL photo reported for this issue.\n" });
    }

    parts.push({
      inlineData: {
        data: standardizedNewPhoto,
        mimeType: newPhotoMimeType,
      },
    });
    parts.push({ text: "Above is the NEW confirmation proof photo uploaded by another user.\n" });

    const prompt = `You are an expert civic quality assurance auditor. Your job is to analyze the new confirmation proof photo to see if it plausibly matches the existing reported civic issue.
    
Existing issue description:
"${existingDescription}"

Instructions:
1. Examine the new confirmation proof photo. Does it show the same type of civic issue/problem (e.g. pothole, broken streetlight, garbage, water leak) described in the existing report?
2. If the original photo is provided (the first image above), compare them to see if they plausibly depict the same location, the same exact physical asset, or the same issue (even if taken from a different angle, under different lighting, or showing slightly different states over time).
3. If they are consistent, set "matches" to true.
4. If the new confirmation photo is completely unrelated (e.g. a selfie, a photo of a pet, a random indoor shot, or a completely different category of problem like a water leak when the original issue is garbage), set "matches" to false.

You must respond with a JSON object matching this schema:
{
  "matches": boolean,
  "confidence": "low" | "medium" | "high",
  "reasoning": "A short explanation of your decision (2-3 sentences max). If it matches, point out what details in the photo correspond to the report. If it doesn't match, explain what the photo actually shows and why it doesn't confirm the report."
}

Do not include any explanation, markdown block formatting, or extra text. Return ONLY the JSON object itself.`;

    parts.push({ text: prompt });

    let response;
    const modelsToTry = [
      "gemini-3.5-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite"
    ];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting verification with model: ${modelName}...`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: { parts },
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                matches: {
                  type: Type.BOOLEAN,
                  description: "True if the confirmation photo plausibly shows the same issue or same location/problem."
                },
                confidence: {
                  type: Type.STRING,
                  enum: ["low", "medium", "high"],
                  description: "Confidence in the decision."
                },
                reasoning: {
                  type: Type.STRING,
                  description: "Reasoning for the decision."
                }
              },
              required: ["matches", "confidence", "reasoning"]
            }
          }
        });
        if (response && response.text) {
          console.log(`Successfully verified confirmation photo using model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed verification with error:`, err.message || err);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All Gemini models failed the verification check.");
    }

    const responseText = response.text.trim();
    const parsed = parseRobustJSON(responseText);
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error in verification check:", error);
    return res.status(500).json({
      error: "Verification check failed due to server error: " + (error.message || error)
    });
  }
});

// 1.28. Verify Resolution Photo using Gemini API
app.post("/api/verify-resolution", async (req, res) => {
  try {
    const { category, description, resolvedPhoto, mimeType } = req.body;

    if (!category || !description || !resolvedPhoto || !mimeType) {
      return res.status(400).json({ error: "Missing required fields: category, description, resolvedPhoto, and mimeType are required." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. Bypassing resolution verification check.");
      return res.json({
        matches: true,
        confidence: "low",
        reasoning: "AI photo verification is temporarily offline. Bypassing check."
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    // Standardize base64 string
    const standardizedPhoto = resolvedPhoto.replace(/^data:image\/\w+;base64,/, "");

    const prompt = `You are an expert civic quality assurance auditor. Your job is to analyze a photo uploaded by a city administrator to prove that a previously reported civic issue has been successfully fixed or resolved.

Original Issue Category: ${category}
Original Issue Description: "${description}"

Instructions:
1. Examine the uploaded proof-of-resolution photo.
2. Judge whether this photo plausibly shows that this type of problem has actually been fixed or resolved.
For example:
- If category is 'pothole', the photo should show a repaired road, filled potholes, fresh asphalt patch, or a clean street surface with no road damage.
- If category is 'streetlight', the photo should show a working, shining streetlight (especially at dusk/night) or a maintenance crew finishing repairs on a light pole.
- If category is 'garbage', the photo should show a completely clean, cleared area, empty dustbins, swept pavements, or the waste having been successfully removed.
- If category is 'water_leak', the photo should show dry pavement, repaired valves, completed pipe trenches, or dry pipes.
- If category is 'other', judge whether the photo indicates a logical solution or fix to the issue described in the original description.
3. If the photo is completely unrelated (e.g., a selfie, a random indoor shot, a pet, a landscape unrelated to city streets, or a photo of an unresolved issue/different problem), set "matches" to false.

You must reply with a valid JSON object matching this schema:
{
  "matches": boolean,
  "confidence": "low" | "medium" | "high",
  "reasoning": "A concise, polite 1-2 sentence explanation of your decision. If matches is true, explain what in the photo shows a successful fix. If matches is false, explain why the photo is irrelevant or does not show a fix for this specific issue category."
}

Do not include any explanation, markdown block formatting, or extra text. Return ONLY the JSON object itself.`;

    let response;
    const modelsToTry = [
      "gemini-3.5-flash",
      "gemini-flash-latest",
      "gemini-3.1-flash-lite"
    ];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting resolution verification with model: ${modelName}...`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: [
            {
              role: "user",
              parts: [
                {
                  inlineData: {
                    data: standardizedPhoto,
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
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                matches: {
                  type: Type.BOOLEAN,
                  description: "True if the photo plausibly shows that this type of problem was actually fixed."
                },
                confidence: {
                  type: Type.STRING,
                  enum: ["low", "medium", "high"],
                  description: "Confidence in the decision."
                },
                reasoning: {
                  type: Type.STRING,
                  description: "Reasoning for the decision."
                }
              },
              required: ["matches", "confidence", "reasoning"]
            }
          }
        });
        if (response && response.text) {
          console.log(`Successfully verified resolution photo using model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed verification with error:`, err.message || err);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All Gemini models failed the resolution verification check.");
    }

    const responseText = response.text.trim();
    const parsed = parseRobustJSON(responseText);
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error in resolution verification:", error);
    // On error, let's allow bypassing or handle gracefully so admins are not blocked permanently by API issues
    return res.json({
      matches: true,
      confidence: "low",
      reasoning: "Resolution verification service is temporarily busy. Proceeding with default approval."
    });
  }
});

// 1.3. Generate Certificate of Civic Contribution using Gemini API
app.post("/api/certificate/generate", async (req, res) => {
  try {
    const { name, totalReports, badge, score } = req.body;

    if (!name || totalReports === undefined || !badge || score === undefined) {
      return res.status(400).json({ error: "Missing name, totalReports, badge, or score in request body." });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. Using high-quality mock certificate text.");
      return res.json({
        title: "Certificate of Civic Contribution",
        recipient: name,
        citationText: `In profound appreciation of exemplary civic dedication, this citation is presented to ${name} for reporting ${totalReports} vital community issues. Having attained the distinguished rank of "${badge}" with a civic score of ${score} points, their outstanding vigilance and prompt actions have contributed immensely to the safety, cleanliness, and overall quality of life in their neighborhood, embodying the true spirit of a Community Hero.`,
        signatureTitle: "Community Hero Guardians Panel",
        platformBranding: "Community Hero Platform"
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = `You are the official citation and recognition manager for "Community Hero", a civic engagement and crowd-sourced neighborhood improvement platform in India.
Generate an official-sounding but non-governmental "Certificate of Civic Contribution" citation text.
The certificate is for a citizen named: "${name}".
They have submitted ${totalReports} reports, earned the badge "${badge}", and achieved a civic contribution score of ${score} points.
The current date is: "${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}".

The citation should be highly inspiring, formal, and structured. It must recognize their selfless vigilance in helping light up streets, reporting garbage piles, fixing potholes, and water leaks.
It MUST frame the recognition clearly as being from the "Community Hero Platform" and the community of citizens, and NOT from any real government department, municipality, or state/national authority.

Please reply with a valid JSON object.`;

    let response;
    const modelsToTry = [
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.5-flash"
    ];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting certificate generation with model: ${modelName}...`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                title: {
                  type: Type.STRING,
                  description: "Certificate title, e.g., Certificate of Civic Contribution or Citizen Excellence Citation"
                },
                recipient: {
                  type: Type.STRING,
                  description: "Full name of the recipient"
                },
                citationText: {
                  type: Type.STRING,
                  description: "A formal, high-sounding citation paragraph recognizing their specific reports, score, and badge rank."
                },
                signatureTitle: {
                  type: Type.STRING,
                  description: "Title of the issuer, e.g., Community Hero Board of Guardians / Chief Mobilizer"
                },
                platformBranding: {
                  type: Type.STRING,
                  description: "Community Hero Platform tagline"
                }
              },
              required: ["title", "recipient", "citationText", "signatureTitle", "platformBranding"]
            }
          },
        });
        if (response && response.text) {
          console.log(`Successfully generated certificate text using model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed certificate generation with error:`, err.message || err);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All Gemini models failed the certificate generation.");
    }

    const responseText = response.text.trim();
    const parsed = parseRobustJSON(responseText);
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error in certificate generation:", error);
    return res.json({
      title: "Certificate of Civic Contribution",
      recipient: req.body.name || "Civic Hero",
      citationText: `In recognition of dedicated civic service, this citation honors their contribution of ${req.body.totalReports || 0} local reports and badge tier "${req.body.badge || "Observer"}" with a cumulative civic score of ${req.body.score || 0} points, serving as an inspiration for collective neighborhood action.`,
      signatureTitle: "Community Hero Platform Guardians",
      platformBranding: "Community Hero - Uniting Neighbors for a Better India"
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

// 7. Get AI-generated predictive insights (Supports both GET and POST)
const handlePredictiveInsights = async (req: express.Request, res: express.Response) => {
  try {
    const issues = (req.method === "POST" && req.body && req.body.issues) ? req.body.issues : getIssues();

    // Group issues by category and summarize for Gemini context
    const simplifiedIssues = issues.map((i: any) => ({
      category: i.category,
      severity: i.severity,
      status: i.status || "Open",
      timestamp: i.timestamp,
      location: i.location?.address || i.location?.district || "Unknown area"
    }));

    // If there are very few issues, we can construct standard insights directly
    if (issues.length < 3) {
      return res.json({
        insights: [
          {
            title: "Analysis Sample Size Low",
            type: "general",
            metric: "Awaiting Reports",
            description: "With fewer than 3 community reports logged, there are currently not enough historical data points to generate meaningful predictive trends. Please report more issues to activate prediction engines.",
            category: "other"
          },
          {
            title: "Proactive Spot Checking",
            type: "risk",
            metric: "Preventative",
            description: "Early data suggests checking nearby lighting and pavement integrity during the turn of the seasons can prevent sudden streetlight out or road hazard complaints.",
            category: "streetlight"
          }
        ]
      });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not defined. Using programmatic insights engine.");
      // Generate nice programmatic fallback insights
      return res.json({
        insights: getFallbackInsights(issues)
      });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = `You are an expert civic data analyst. Analyze these reported urban and environmental issues for our "Community Hero" platform:
${JSON.stringify(simplifiedIssues, null, 2)}

Based on this historical and current data, perform a forward-looking predictive analysis and generate 2-3 short, highly-specific insights.
For example:
- Identify if any category is trending upward recently (e.g., more potholes or water leaks in the last week/month)
- Identify which area/district has the highest concentration of unresolved issues and why it is a bottleneck
- Give an estimated risk likelihood (e.g., high/medium/low) that a given category of unresolved issues will escalate/keep increasing if unaddressed.

Each insight must follow this exact JSON schema:
{
  "insights": [
    {
      "title": "Short descriptive title (e.g., 'Garbage Accumulation Alert' or 'Water Leak Persistence in Westside')",
      "type": "trending" | "concentration" | "risk" | "general",
      "metric": "A short supporting statistic or risk rating, e.g. '85% increase', 'High Risk', '4 open issues', '7-Day Bottleneck'",
      "description": "A 2-3 sentence forward-looking analysis of patterns, trends, potential consequences if left unaddressed, or recommended actions.",
      "category": "The main category this is about: 'pothole' | 'streetlight' | 'garbage' | 'water_leak' | 'other'"
    }
  ]
}

Ensure the analysis is realistic and strictly derived from the provided data. Do not make up fake categories.
Return ONLY a valid JSON object matching the schema. No markdown formatting, no code block backticks (no \`\`\`json), no additional text.`;

    let response;
    const modelsToTry = [
      "gemini-3.1-flash-lite",
      "gemini-flash-latest",
      "gemini-3.5-flash"
    ];
    let lastError: any = null;

    for (const modelName of modelsToTry) {
      try {
        console.log(`Attempting predictive insights generation with model: ${modelName}...`);
        response = await ai.models.generateContent({
          model: modelName,
          contents: prompt,
          config: {
            responseMimeType: "application/json",
          },
        });
        if (response && response.text) {
          console.log(`Successfully generated predictive insights using model: ${modelName}`);
          break;
        }
      } catch (err: any) {
        console.warn(`Model ${modelName} failed with error:`, err.message || err);
        lastError = err;
      }
    }

    if (!response || !response.text) {
      throw lastError || new Error("All Gemini models failed to generate predictive insights.");
    }

    const responseText = response.text;
    if (!responseText) {
      throw new Error("Empty response from Gemini API");
    }

    const parsed = parseRobustJSON(responseText);
    return res.json(parsed);
  } catch (error: any) {
    console.error("Error generating predictive insights with Gemini API:", error);
    // Return standard fallback insights so the dashboard never crashes
    const issues = (req.method === "POST" && req.body && req.body.issues) ? req.body.issues : getIssues();
    return res.json({
      insights: getFallbackInsights(issues),
      error: "Failed to generate AI insights due to service demand. Applied standard fallback insights."
    });
  }
};

app.get("/api/predictive-insights", handlePredictiveInsights);
app.post("/api/predictive-insights", handlePredictiveInsights);

app.post("/api/generate-complaint-letter", async (req, res) => {
  try {
    const { category, description, address, timestamp, confirmationCount, reporterName, id } = req.body;

    const issueDate = new Date(timestamp || Date.now());
    const now = new Date();
    const diffTime = Math.max(0, now.getTime() - issueDate.getTime());
    const daysOpen = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY is not set. Using local fallback letter generator.");
      const fallbackLetter = getFallbackEscalatedLetter(category, address, description, id, daysOpen, confirmationCount || 0, reporterName);
      return res.json({ letter: fallbackLetter });
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });

    const prompt = `You are an AI Civic Advocate for the "Community Hero" (Bharat Civic Hub) platform.
Your task is to write an official, professional, and URGENT civic grievance complaint letter to local municipal authorities regarding a community-reported issue.

Issue Details:
- Category of Issue: ${category}
- Location / Address: ${address}
- Description of Problem: ${description}
- Number of Days Open/Unresolved: ${daysOpen} days
- Confirmation Count (number of other citizens who verified and supported this issue): ${confirmationCount || 0} citizens
- Reference ID: ${id}
- Citizen Reporter: ${reporterName || "Concerned Citizen"}

CRITICAL REQUIREMENTS:
1. The letter must have an URGENT, persistent, and authoritative yet polite tone, clearly indicating that this issue has been officially escalated.
2. It MUST explicitly mention that the issue is urgent.
3. It MUST explicitly mention the exact number of days the issue has been open (${daysOpen} days).
4. It MUST explicitly mention the confirmation count (${confirmationCount || 0} confirmations from other local residents).
5. It must be structured like a formal official letter addressed to "Respected Authority Officers," or "The Municipal Commissioner," and signed off on behalf of the reporter via the CommunityHero Bharat Civic Hub.
6. Return only the complete body of the letter. Do not include any extra introduction, markdown annotations, triple backticks, or explanation. Begin directly with "Respected Authority Officers," and end with the citizen's signature/sign-off.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
    });

    const letter = response.text?.trim() || getFallbackEscalatedLetter(category, address, description, id, daysOpen, confirmationCount || 0, reporterName);
    return res.json({ letter });
  } catch (error: any) {
    console.error("Error generating complaint letter with Gemini API:", error);
    try {
      const { category, description, address, timestamp, confirmationCount, reporterName, id } = req.body;
      const issueDate = new Date(timestamp || Date.now());
      const now = new Date();
      const diffTime = Math.max(0, now.getTime() - issueDate.getTime());
      const daysOpen = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      const fallbackLetter = getFallbackEscalatedLetter(category, address, description, id, daysOpen, confirmationCount || 0, reporterName);
      return res.json({ letter: fallbackLetter, error: error.message });
    } catch (fallbackError) {
      return res.status(500).json({ error: "Failed to generate complaint letter" });
    }
  }
});

function getFallbackEscalatedLetter(category: string, address: string, description: string, id: string, daysOpen: number, confirmationCount: number, reporterName: string) {
  return `Respected Authority Officers,

SUBJECT: URGENT ESCALATION - Civic Grievance regarding ${category} at ${address}

I am writing to formally escalate an urgent civic issue regarding ${category} identified at ${address}, registered under Report Reference ID: ${id}.

This matter is highly URGENT and has remained unresolved for ${daysOpen} days since its initial report. It is a significant public concern that has been officially verified and supported with additional proof/confirmations by ${confirmationCount} other local residents in our community.

Description of Issue:
${description}

Given the prolonged delay and the active confirmations from multiple citizens, we request immediate intervention to inspect and resolve this issue at the earliest possible convenience.

Regards,
${reporterName || "Concerned Citizen"}
(Citizen report escalated via CommunityHero Bharat Civic Hub)`;
}

// Helper function to build high-quality programmatic fallback insights when Gemini is unavailable
function getFallbackInsights(issues: any[]) {
  // Count by category
  const categories: Record<string, number> = {};
  const openByCategory: Record<string, number> = {};
  
  issues.forEach((i: any) => {
    categories[i.category] = (categories[i.category] || 0) + 1;
    if (i.status === "Open" || i.status === "investigating" || i.status === "scheduled") {
      openByCategory[i.category] = (openByCategory[i.category] || 0) + 1;
    }
  });

  // Find top category
  let topCategory = "pothole";
  let maxCount = 0;
  Object.entries(categories).forEach(([cat, count]) => {
    if (count > maxCount) {
      maxCount = count;
      topCategory = cat;
    }
  });

  // Find top open category
  let topOpenCategory = "garbage";
  let maxOpenCount = 0;
  Object.entries(openByCategory).forEach(([cat, count]) => {
    if (count > maxOpenCount) {
      maxOpenCount = count;
      topOpenCategory = cat;
    }
  });

  const readableCategory = (cat: string) => {
    return cat.replace("_", " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  return [
    {
      title: `${readableCategory(topCategory)} Dominates Active Reports`,
      type: "concentration",
      metric: `${maxCount} Reports`,
      description: `Historical reports show ${readableCategory(topCategory)} remains the most frequently reported issue across neighborhoods. Continuous preventative maintenance is highly recommended to control the growth rate.`,
      category: topCategory
    },
    {
      title: `Unresolved ${readableCategory(topOpenCategory)} Accumulation Risk`,
      type: "risk",
      metric: "Medium Risk",
      description: `There are currently ${maxOpenCount || 0} unresolved ${readableCategory(topOpenCategory)} issues pending action. Delaying intervention could lead to localized neighborhood hygiene or safety escalations over the coming days.`,
      category: topOpenCategory
    }
  ];
}

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
      lng: 80.2337,
      streetAddress: "GN Chetty Road, T. Nagar",
      city: "Chennai",
      state: "Tamil Nadu",
      zipCode: "600017"
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
      lng: 72.8493,
      streetAddress: "Western Express Highway, Malad East",
      city: "Mumbai",
      state: "Maharashtra",
      zipCode: "400097"
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
      lng: 77.6271,
      streetAddress: "Outer Ring Road, HSR Layout",
      city: "Bengaluru",
      state: "Karnataka",
      zipCode: "560102"
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
      lng: 77.2433,
      streetAddress: "Lajpat Nagar III",
      city: "New Delhi",
      state: "Delhi",
      zipCode: "110024"
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
