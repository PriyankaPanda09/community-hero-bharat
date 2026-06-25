import React, { useState, useRef } from "react";
import { CivicUser, CivicIssue, IssueCategory, IssueSeverity, LocationData, AnalysisResult } from "../types";
import { Upload, Camera, AlertCircle, CheckCircle2, MapPin, Sparkles, Send, Edit3, RefreshCw, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useFirebase } from "../FirebaseContext";

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

const SAMPLE_PHOTOS = [
  {
    name: "Mumbai Hwy Pothole",
    url: getSvgDataUrl(POTHOLE_SVG),
    category: "pothole",
    severity: "high",
    description: "Pothole on Mumbai highway: Large, deep, jagged pothole in the middle of the eastbound lane on Western Express Highway, Malad East. High danger to passing vehicles and two-wheelers, swerving hazards.",
    address: "Western Express Highway, Malad East, Mumbai, Maharashtra 400097",
    lat: 19.1648,
    lng: 72.8493
  },
  {
    name: "Delhi Streetlight Out",
    url: getSvgDataUrl(STREETLIGHT_SVG),
    category: "streetlight",
    severity: "low",
    description: "Broken streetlight in Delhi colony: The residential street lamp outside Lajpat Nagar III has completely gone dark, rendering the local pavement completely unlit and highly unsafe for walkers in evenings.",
    address: "Lajpat Nagar III, New Delhi, Delhi 110024",
    lat: 28.5672,
    lng: 77.2433
  },
  {
    name: "Bangalore Waste Pile",
    url: getSvgDataUrl(GARBAGE_SVG),
    category: "garbage",
    severity: "medium",
    description: "Garbage pile near Bangalore apartment: Loose trash bags, cardboard packaging boxes, and organic waste illegally dumped on the walkway of Outer Ring Road, HSR Layout, near the residential gate.",
    address: "Outer Ring Road, HSR Layout, Bengaluru, Karnataka 560102",
    lat: 12.9279,
    lng: 77.6271
  },
  {
    name: "Chennai Water Leak",
    url: getSvgDataUrl(WATER_LEAK_SVG),
    category: "water_leak",
    severity: "high",
    description: "Water leakage in Chennai street: Clean water is continuously erupting and bubbling up through the road pavement of GN Chetty Road, T. Nagar. Substantial stream of water pooling near intersections and gutters.",
    address: "GN Chetty Road, T. Nagar, Chennai, Tamil Nadu 600017",
    lat: 13.0418,
    lng: 80.2337
  }
];

interface ReportIssueFormProps {
  currentUser: CivicUser | null;
  onSuccessSubmit: () => void;
  openLoginModal: () => void;
}

export default function ReportIssueForm({ currentUser, onSuccessSubmit, openLoginModal }: ReportIssueFormProps) {
  const { createIssue, addCoReporter, issues } = useFirebase();
  
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [photoMimeType, setPhotoMimeType] = useState<string>("image/png");
  const [photoBase64, setPhotoBase64] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  // Form fields
  const [category, setCategory] = useState<IssueCategory>("other");
  const [severity, setSeverity] = useState<IssueSeverity>("medium");
  const [description, setDescription] = useState("");
  const [address, setAddress] = useState("");
  const [lat, setLat] = useState<string>("");
  const [lng, setLng] = useState<string>("");
  const [note, setNote] = useState("");
  const [isApproximate, setIsApproximate] = useState(false);

  // Duplicate state
  const [duplicateMatch, setDuplicateMatch] = useState<{
    issue: CivicIssue;
    evaluation: { is_duplicate: boolean; confidence: "low" | "medium" | "high"; reasoning: string };
  } | null>(null);

  // Duplicate detection helper using Haversine formula and Gemini API endpoint
  const checkDuplicate = async (
    newCategory: string,
    newDesc: string,
    newLat: number,
    newLng: number
  ): Promise<{ duplicateIssue: CivicIssue; evaluation: { is_duplicate: boolean; confidence: "low" | "medium" | "high"; reasoning: string } } | null> => {
    // Haversine distance in meters
    const getDistanceInMeters = (lat1: number, lon1: number, lat2: number, lon2: number) => {
      const R = 6371e3; // Earth's radius in meters
      const φ1 = (lat1 * Math.PI) / 180;
      const φ2 = (lat2 * Math.PI) / 180;
      const Δφ = ((lat2 - lat1) * Math.PI) / 180;
      const Δλ = ((lon2 - lon1) * Math.PI) / 180;

      const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
                Math.cos(φ1) * Math.cos(φ2) *
                Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

      return R * c;
    };

    // Find closest candidate with same category and within 300 meters
    const candidateIssues = issues
      .filter(issue => issue.category === newCategory && issue.status !== "Resolved")
      .map(issue => {
        const dist = getDistanceInMeters(
          newLat,
          newLng,
          issue.location.lat || 0,
          issue.location.lng || 0
        );
        return { issue, distance: dist };
      })
      .filter(item => item.distance <= 300)
      .sort((a, b) => a.distance - b.distance);

    if (candidateIssues.length === 0) {
      return null;
    }

    const closestCandidate = candidateIssues[0].issue;

    try {
      const res = await fetch("/api/check-duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: newCategory,
          newDescription: newDesc,
          existingDescription: closestCandidate.description
        })
      });

      if (!res.ok) {
        throw new Error("Duplicate check endpoint returned error.");
      }

      const evaluation = await res.json();
      return {
        duplicateIssue: closestCandidate,
        evaluation
      };
    } catch (err) {
      console.error("Duplicate check call failed:", err);
      return null;
    }
  };

  // AI states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiAnalyzed, setAiAnalyzed] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [aiDisclaimer, setAiDisclaimer] = useState(false);

  // Submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const convertPresetToBase64 = async (url: string): Promise<{ base64: string; mime: string }> => {
    if (url.startsWith("data:") && url.includes("image/svg+xml")) {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = 100;
            canvas.height = 100;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.fillStyle = "#1e293b";
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.4);
              const base64 = dataUrl.split(",")[1];
              resolve({ base64, mime: "image/jpeg" });
              return;
            }
          } catch (err) {
            console.error("Canvas draw SVG error:", err);
          }
          resolve({
            base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
            mime: "image/png"
          });
        };
        img.onerror = () => {
          resolve({
            base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
            mime: "image/png"
          });
        };
        img.src = url;
      });
    }

    if (url.startsWith("data:")) {
      try {
        const parts = url.split(",");
        const mimePart = parts[0];
        const dataPart = parts.slice(1).join(",");
        const mime = mimePart.split(";")[0].replace("data:", "");
        if (mimePart.includes("base64")) {
          return { base64: dataPart, mime };
        } else {
          const decoded = decodeURIComponent(dataPart);
          const base64 = btoa(unescape(encodeURIComponent(decoded)));
          return { base64, mime };
        }
      } catch (err) {
        console.error("Error direct parsing data url:", err);
      }
    }
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          const result = reader.result as string;
          const mime = blob.type || "image/jpeg";
          const base64 = result.split(",")[1] || result;
          resolve({ base64, mime });
        };
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (e) {
      console.error("Error converting preset:", e);
      return {
        base64: "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        mime: "image/png"
      };
    }
  };

  const analyzeWithAI = async (base64Img: string, mime: string) => {
    setIsAnalyzing(true);
    setAiError(null);
    setAiDisclaimer(false);

    try {
      const response = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: base64Img, mimeType: mime }),
      });

      if (!response.ok) {
        throw new Error("Analysis failed. Server returned status: " + response.status);
      }

      const result = await response.json();

      if (result.error) {
        if (result.fallback) {
          setCategory(result.fallback.category);
          setSeverity(result.fallback.severity);
          setDescription(result.fallback.description);
          setAiDisclaimer(true);
        } else {
          throw new Error(result.error);
        }
      } else {
        setCategory(result.category);
        setSeverity(result.severity);
        setDescription(result.description);
      }
      setAiAnalyzed(true);
    } catch (err: any) {
      console.error("AI analysis error:", err);
      setAiError("Could not reach Gemini AI analyzer. Please fill details manually.");
      setAiAnalyzed(true);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const compressImage = (file: File): Promise<{ base64: string; dataUrl: string }> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();

      reader.onload = (e) => {
        img.src = e.target?.result as string;
      };

      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height = Math.round((height * MAX_WIDTH) / width);
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width = Math.round((width * MAX_HEIGHT) / height);
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Canvas 2D context not available"));
          return;
        }

        ctx.fillStyle = "#1e293b";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);
        
        // Compress with 85% quality (0.85) for clear and sharp photos
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        const base64 = dataUrl.split(",")[1];
        resolve({ base64, dataUrl });
      };

      img.onerror = (err) => reject(err);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setErrorMsg("Please upload an image file.");
      return;
    }

    setIsAnalyzing(true);
    setErrorMsg(null);
    setAiError(null);

    try {
      const { base64, dataUrl } = await compressImage(file);
      setPhotoPreview(dataUrl);
      setPhotoMimeType("image/jpeg");
      setPhotoBase64(base64);
      await analyzeWithAI(base64, "image/jpeg");
    } catch (err: any) {
      console.error("Compression / Analysis error:", err);
      setErrorMsg("Failed to process and analyze image.");
      setIsAnalyzing(false);
    }
  };

  const selectPresetPhoto = async (preset: typeof SAMPLE_PHOTOS[0]) => {
    setIsAnalyzing(true);
    setAiError(null);
    
    setCategory(preset.category as IssueCategory);
    setSeverity(preset.severity as IssueSeverity);
    setDescription(preset.description);
    setAddress(preset.address);
    setLat(preset.lat.toString());
    setLng(preset.lng.toString());
    setIsApproximate(true);

    const converted = await convertPresetToBase64(preset.url);
    const compressedPreview = `data:${converted.mime};base64,${converted.base64}`;
    setPhotoPreview(compressedPreview);
    setPhotoBase64(converted.base64);
    setPhotoMimeType(converted.mime);
    await analyzeWithAI(converted.base64, converted.mime);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = () => {
    setDragOver(false);
  };

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file && file.type.startsWith("image/")) {
      setIsAnalyzing(true);
      setErrorMsg(null);
      setAiError(null);
      try {
        const { base64, dataUrl } = await compressImage(file);
        setPhotoPreview(dataUrl);
        setPhotoMimeType("image/jpeg");
        setPhotoBase64(base64);
        await analyzeWithAI(base64, "image/jpeg");
      } catch (err: any) {
        console.error("Compression / Analysis error:", err);
        setErrorMsg("Failed to process and analyze image.");
        setIsAnalyzing(false);
      }
    } else {
      setErrorMsg("Please drop an image file.");
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setErrorMsg("Geolocation is not supported by your browser. Please enter your address manually.");
      return;
    }

    setIsLocating(true);
    setErrorMsg(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        setLat(latitude.toFixed(6));
        setLng(longitude.toFixed(6));

        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`, {
            headers: {
              "User-Agent": "CommunityHero/1.0"
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              setAddress(data.display_name);
            } else {
              setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
            }
          } else {
            setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
          }
        } catch (err) {
          console.error("Reverse geocoding error:", err);
          setAddress(`${latitude.toFixed(6)}, ${longitude.toFixed(6)}`);
        } finally {
          setIsApproximate(true);
          setIsLocating(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorStr = "Unable to retrieve your location. Please enter your address manually.";
        if (error.code === error.PERMISSION_DENIED) {
          errorStr = "Location access denied. Please allow location access or type your address manually.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorStr = "Location information is unavailable. Please type your address manually.";
        } else if (error.code === error.TIMEOUT) {
          errorStr = "Location request timed out. Please type your address manually.";
        }
        setErrorMsg(errorStr);
        setIsLocating(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const handleSubmit = async (e: React.FormEvent, forceSubmit: boolean = false) => {
    if (e) e.preventDefault();
    if (!currentUser) {
      openLoginModal();
      return;
    }

    if (!photoPreview || !photoBase64) {
      setErrorMsg("Please upload or select an issue photo.");
      return;
    }

    if (!address.trim()) {
      setErrorMsg("Please supply an address or area.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);
    setDuplicateMatch(null);
    
    const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    try {
      const parsedLat = parseFloat(lat) || 12.9716;
      const parsedLng = parseFloat(lng) || 77.5946;

      // Duplicate detection gate
      if (!forceSubmit) {
        setUploadProgress(15);
        await delay(300);
        const dupResult = await checkDuplicate(category, description, parsedLat, parsedLng);
        if (
          dupResult &&
          dupResult.evaluation.is_duplicate &&
          (dupResult.evaluation.confidence === "medium" || dupResult.evaluation.confidence === "high")
        ) {
          setDuplicateMatch({
            issue: dupResult.duplicateIssue,
            evaluation: dupResult.evaluation
          });
          setIsSubmitting(false);
          setUploadProgress(null);
          return; // STOP normal submission to show comparison UI
        }
      }

      // Step 1: Photo compressed (20%)
      setUploadProgress(20);
      await delay(500);

      // Step 2: AI analysis done (60%)
      setUploadProgress(60);
      await delay(500);

      // Step 3: Firestore saved (100%)
      await createIssue({
        photoUrl: photoPreview, // Store the compressed base64 string directly in Firestore
        category,
        severity,
        description,
        location: {
          address,
          lat: parsedLat,
          lng: parsedLng,
        },
        status: "Open",
        reporterId: currentUser.uid,
        reporterName: currentUser.displayName,
        reporterEmail: currentUser.email,
        reporterPhoto: currentUser.photoURL || "",
        note,
        timestamp: new Date().toISOString(),
      });

      setUploadProgress(100);
      await delay(300);

      setSuccess(true);
      setPhotoPreview(null);
      setPhotoBase64(null);
      setDescription("");
      setAddress("");
      setLat("");
      setLng("");
      setNote("");
      setAiAnalyzed(false);

      setTimeout(() => {
        setSuccess(false);
        onSuccessSubmit();
      }, 1500);
    } catch (err: any) {
      console.error("Submission failed:", err);
      setErrorMsg(err.message || "Failed to submit civic issue. Please try again.");
    } finally {
      setIsSubmitting(false);
      setUploadProgress(null);
    }
  };

  const handleConfirmSameIssue = async () => {
    if (!duplicateMatch || !currentUser) return;
    setIsSubmitting(true);
    setErrorMsg(null);
    try {
      await addCoReporter(duplicateMatch.issue.id, {
        uid: currentUser.uid,
        displayName: currentUser.displayName,
        email: currentUser.email,
        photoURL: currentUser.photoURL || ""
      });

      setSuccess(true);
      setDuplicateMatch(null);
      setPhotoPreview(null);
      setPhotoBase64(null);
      setDescription("");
      setAddress("");
      setLat("");
      setLng("");
      setNote("");
      setAiAnalyzed(false);

      setTimeout(() => {
        setSuccess(false);
        onSuccessSubmit();
      }, 1500);
    } catch (err: any) {
      console.error("Co-reporter confirmation failed:", err);
      setErrorMsg(err.message || "Failed to register duplicate confirmation. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-2 px-1 text-text-primary" id="report-issue-container">
      {/* Success banner overlay */}
      <AnimatePresence>
        {success && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl flex items-center gap-3 text-emerald-400"
            id="report-success-banner"
          >
            <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
            <div>
              <p className="font-extrabold text-sm">Thank You, Citizen Hero!</p>
              <p className="text-xs opacity-90">Civic anomaly successfully recorded. Syncing feed...</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {duplicateMatch ? (
        <div className="bg-bg-card border border-border-card rounded-3xl p-6 sm:p-8 card-shadow-glow" id="duplicate-warning-view">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center font-bold">
              <AlertTriangle className="w-5.5 h-5.5" />
            </div>
            <div>
              <h2 className="text-xl font-display font-extrabold text-text-primary tracking-tight">This looks similar to an existing report</h2>
              <p className="text-xs text-text-secondary mt-0.5">We found a potential duplicate of your report reported nearby.</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* AI Duplicate Evaluation Callout */}
            <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-2xl space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-amber-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400 animate-pulse" />
                  AI Duplicate Evaluation
                </span>
                <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full tracking-wider ${
                  duplicateMatch.evaluation.confidence === "high"
                    ? "bg-rose-500/15 text-rose-500 border border-rose-500/10"
                    : "bg-amber-500/15 text-amber-500 border border-amber-500/10"
                }`}>
                  {duplicateMatch.evaluation.confidence} Confidence
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed font-semibold italic">
                "{duplicateMatch.evaluation.reasoning}"
              </p>
            </div>

            {/* Comparison Side-by-Side Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Existing issue card */}
              <div className="bg-bg-card/50 border border-border-card rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-text-muted tracking-wider block mb-2">Similar Existing Report</span>
                  <div className="h-40 rounded-xl overflow-hidden border border-border-card mb-3 relative bg-bg-card/40">
                    {duplicateMatch.issue.photoUrl ? (
                      <img
                        src={duplicateMatch.issue.photoUrl}
                        alt="Existing Report"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">No image</div>
                    )}
                    <div className="absolute top-2 right-2 bg-accent-teal/90 text-white font-extrabold text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wider">
                      {duplicateMatch.issue.status}
                    </div>
                  </div>
                  <h4 className="text-xs font-bold text-text-primary capitalize mb-1">
                    Category: {duplicateMatch.issue.category.replace("_", " ")}
                  </h4>
                  <p className="text-xs text-text-secondary line-clamp-3 mb-2 font-semibold">
                    "{duplicateMatch.issue.description}"
                  </p>
                </div>
                <div className="pt-2 border-t border-border-card/30 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-slate-500/10 flex items-center justify-center font-bold text-[10px] text-text-secondary">
                    {duplicateMatch.issue.reporterName.charAt(0)}
                  </div>
                  <span className="text-[10px] text-text-muted font-bold truncate">
                    By {duplicateMatch.issue.reporterName}
                  </span>
                </div>
              </div>

              {/* New Draft issue card */}
              <div className="bg-bg-card/50 border border-border-card rounded-2xl p-4 flex flex-col justify-between">
                <div>
                  <span className="text-[10px] font-black uppercase text-accent-teal tracking-wider block mb-2">Your New Draft</span>
                  <div className="h-40 rounded-xl overflow-hidden border border-border-card mb-3 relative bg-bg-card/40">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Your draft"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-text-muted text-xs">No image</div>
                    )}
                  </div>
                  <h4 className="text-xs font-bold text-text-primary capitalize mb-1">
                    Category: {category.replace("_", " ")}
                  </h4>
                  <p className="text-xs text-text-secondary line-clamp-3 mb-2 font-semibold">
                    "{description}"
                  </p>
                </div>
                <div className="pt-2 border-t border-border-card/30 flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-accent-teal/10 flex items-center justify-center font-bold text-[10px] text-accent-teal">
                    {currentUser?.displayName?.charAt(0) || "U"}
                  </div>
                  <span className="text-[10px] text-accent-teal font-bold truncate">
                    By You
                  </span>
                </div>
              </div>
            </div>

            {/* Actions Block */}
            <div className="pt-4 border-t border-border-card/30 space-y-3">
              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-500 font-semibold">
                  {errorMsg}
                </div>
              )}
              
              <button
                type="button"
                onClick={handleConfirmSameIssue}
                disabled={isSubmitting}
                className="w-full bg-accent-teal hover:bg-accent-teal-hover text-white font-bold py-3 px-4 rounded-xl shadow-md flex items-center justify-center gap-2 transition-all transform hover:-translate-y-0.5 active:scale-98 cursor-pointer disabled:opacity-50"
                id="confirm-duplicate-button"
              >
                {isSubmitting ? (
                  <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Confirm it's the same issue</span>
              </button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={(e) => handleSubmit(e, true)}
                  disabled={isSubmitting}
                  className="text-xs text-text-secondary hover:text-accent-teal underline transition-colors cursor-pointer font-bold disabled:opacity-50"
                  id="bypass-duplicate-button"
                >
                  No, this is different. Submit anyway.
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-bg-card border border-border-card rounded-3xl p-6 sm:p-8 card-shadow-glow">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-accent-teal/10 text-accent-teal border border-accent-teal/20 flex items-center justify-center font-bold">
            <Camera className="w-5.5 h-5.5" />
          </div>
          <div>
            <h2 className="text-xl font-display font-extrabold text-text-primary tracking-tight">Report An Anomaly</h2>
            <p className="text-xs text-text-secondary mt-0.5">Upload a photo to invoke Gemini AI visual categorisation instantly.</p>
          </div>
        </div>

        {/* Preset Selection Deck */}
        <div className="mb-6 bg-bg-card/45 border border-border-card rounded-2xl p-4">
          <p className="text-xs font-bold text-text-secondary mb-3 uppercase tracking-wider flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-accent-teal animate-pulse" />
            Test With Bharat Presets
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {SAMPLE_PHOTOS.map((sample, i) => (
              <button
                key={i}
                type="button"
                onClick={() => selectPresetPhoto(sample)}
                className="group relative h-16 rounded-xl overflow-hidden border border-border-card/80 hover:border-accent-teal text-left transition-all cursor-pointer focus:outline-none transform hover:scale-102"
              >
                <img
                  src={sample.url}
                  alt={sample.name}
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-slate-950/50 group-hover:bg-slate-950/25 transition-colors flex items-end p-2">
                  <span className="text-[10px] text-white font-extrabold leading-none truncate w-full">
                    {sample.name}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Upload Drop Zone */}
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`relative h-60 rounded-2xl border-2 border-dashed flex flex-col items-center justify-center p-6 text-center transition-all cursor-pointer ${
            dragOver
              ? "border-accent-teal bg-accent-teal/10"
              : photoPreview
              ? "border-border-card bg-bg-card/20"
              : "border-border-card hover:border-accent-teal bg-bg-card/30"
          }`}
          id="photo-upload-zone"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept="image/*"
            className="hidden"
            id="photo-upload-input"
          />

          {photoPreview ? (
            <div className="absolute inset-0 w-full h-full rounded-2xl overflow-hidden group">
              <img src={photoPreview} alt="Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-slate-950/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                <p className="text-xs text-white font-bold flex items-center gap-1.5">
                  <RefreshCw className="w-4 h-4 animate-spin-slow" /> Replace Media
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-full bg-accent-teal/10 text-accent-teal border border-accent-teal/15 flex items-center justify-center mx-auto shadow-sm">
                <Upload className="w-5.5 h-5.5" />
              </div>
              <div>
                <p className="text-xs sm:text-sm font-bold text-text-primary">Drag & drop photo, or browse file</p>
                <p className="text-[10px] text-text-muted mt-1 font-semibold">Supports JPEG, PNG, or HEIC formats</p>
              </div>
            </div>
          )}

          {/* AI Scanner overlay */}
          {isAnalyzing && (
            <div className="absolute inset-0 bg-bg-card/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-text-primary rounded-2xl z-20">
              <div className="w-11 h-11 rounded-full border-4 border-accent-teal border-t-transparent animate-spin mb-4"></div>
              <h4 className="font-display font-black text-sm flex items-center gap-1.5 text-accent-teal">
                <Sparkles className="w-4 h-4 animate-bounce text-amber-300" />
                Gemini AI Inspecting Media...
              </h4>
              <p className="text-xs text-text-secondary mt-1 max-w-xs leading-relaxed font-semibold">
                Classifying hazards, computing severity index, and generating structural commentary.
              </p>
            </div>
          )}
        </div>

        {/* Submission parameters */}
        <form onSubmit={handleSubmit} className="mt-6 space-y-5">
          {/* AI Inspection results card */}
          <AnimatePresence>
            {aiAnalyzed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-bg-card border border-border-card rounded-2xl p-5 space-y-4 shadow-inner"
                id="ai-analysis-feedback-card"
              >
                <div className="flex items-center justify-between border-b border-border-card/30 pb-3">
                  <h4 className="text-xs font-black text-accent-teal uppercase tracking-widest flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 animate-pulse text-amber-300" />
                    AI-Assisted Dispatch Draft
                  </h4>
                  <span className="text-[10px] text-text-secondary font-black bg-bg-card border border-border-card px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Editable Preview
                  </span>
                </div>

                {aiDisclaimer && (
                  <p className="text-[10px] text-amber-500 bg-amber-500/5 p-3 rounded-xl border border-amber-500/20 flex items-start gap-1.5 font-semibold">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    Gemini API offline model backup used. You can edit variables freely.
                  </p>
                )}

                {aiError && (
                  <p className="text-[10px] text-rose-500 bg-rose-500/5 p-3 rounded-xl border border-rose-500/20 flex items-start gap-1.5 font-semibold">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    {aiError}
                  </p>
                )}

                {/* Grid Category / Severity selections */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Category select dropdown */}
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Detected Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value as IssueCategory)}
                      className="w-full bg-bg-card border border-border-card text-text-primary text-xs font-semibold px-3.5 py-2.5 rounded-xl focus:outline-none focus:border-accent-teal cursor-pointer transition-all shadow-xs"
                    >
                      <option value="pothole">🕳️ Pothole / Road damage</option>
                      <option value="streetlight">💡 Streetlight Outage</option>
                      <option value="garbage">🗑️ Garbage / Dump Pile</option>
                      <option value="water_leak">💧 Water Line Leak</option>
                      <option value="other">⚙️ Other Civic Hazard</option>
                    </select>
                  </div>

                  {/* Severity buttons selection */}
                  <div>
                    <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5">Computed Severity</label>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(["low", "medium", "high"] as IssueSeverity[]).map((level) => {
                        const colors = {
                          low: { active: "bg-emerald-500/25 border-emerald-500 text-emerald-400 font-bold", inactive: "border-border-card hover:bg-bg-card/80 text-text-secondary" },
                          medium: { active: "bg-amber-500/25 border-amber-500 text-amber-400 font-bold", inactive: "border-border-card hover:bg-bg-card/80 text-text-secondary" },
                          high: { active: "bg-rose-500/25 border-rose-500 text-rose-400 font-bold animate-pulse", inactive: "border-border-card hover:bg-bg-card/80 text-text-secondary" },
                        };
                        const isActive = severity === level;
                        return (
                          <button
                            key={level}
                            type="button; button"
                            onClick={() => setSeverity(level)}
                            className={`border text-[10px] font-black py-2 rounded-xl text-center uppercase tracking-wider transition-all cursor-pointer ${
                              isActive ? colors[level].active : colors[level].inactive
                            }`}
                          >
                            {level}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* AI Description Input */}
                <div>
                  <label className="block text-[10px] font-bold text-text-muted uppercase tracking-wider mb-1.5 flex items-center justify-between">
                    <span>Generated Damage Description</span>
                    <span className="text-[9px] text-text-muted font-normal italic lowercase">editable description</span>
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={3}
                    className="w-full bg-bg-card/50 px-3.5 py-2.5 rounded-xl border border-border-card text-text-primary placeholder-text-muted/50 focus:border-accent-teal focus:ring-1 focus:ring-accent-teal outline-none text-xs leading-relaxed"
                    placeholder="Refined damage details..."
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Location Fields section */}
          <div className="space-y-4 pt-1">
            <div className="flex items-center justify-between">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider">
                Geospatial Location
              </label>
              <button
                type="button"
                disabled={isLocating}
                onClick={handleUseMyLocation}
                className="text-[10px] font-bold text-accent-teal hover:text-accent-teal-hover disabled:text-text-muted disabled:bg-slate-500/10 disabled:border-border-card transition-colors flex items-center gap-1 cursor-pointer bg-accent-teal/10 border border-accent-teal/20 px-2.5 py-1 rounded-lg"
                id="use-location-button"
              >
                {isLocating ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Locating...
                  </>
                ) : (
                  <>
                    <MapPin className="w-3.5 h-3.5" /> Use my location
                  </>
                )}
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-[10px] font-bold text-text-secondary mb-1">Area / Street Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="e.g. 42 Oakwood St"
                  className="w-full bg-bg-card/50 px-3.5 py-2.5 rounded-xl border border-border-card text-text-primary placeholder-text-muted/50 focus:border-accent-teal outline-none text-xs font-semibold"
                  id="address-input"
                />
                {address && isApproximate && (
                  <p className="text-[10px] text-amber-500 font-bold mt-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" /> Approximate location — please confirm or edit
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary mb-1">Latitude</label>
                  <input
                    type="text"
                    value={lat}
                    onChange={(e) => setLat(e.target.value)}
                    placeholder="e.g. 40.7128"
                    className="w-full bg-bg-card/50 px-3.5 py-2.5 rounded-xl border border-border-card text-text-primary placeholder-text-muted/50 focus:border-accent-teal outline-none text-xs font-semibold"
                    id="latitude-input"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-text-secondary mb-1">Longitude</label>
                  <input
                    type="text"
                    value={lng}
                    onChange={(e) => setLng(e.target.value)}
                    placeholder="e.g. -74.0060"
                    className="w-full bg-bg-card/50 px-3.5 py-2.5 rounded-xl border border-border-card text-text-primary placeholder-text-muted/50 focus:border-accent-teal outline-none text-xs font-semibold"
                    id="longitude-input"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* User Notes */}
          <div>
            <label className="block text-[10px] font-black text-text-muted uppercase tracking-wider mb-2">
              Commentary Note <span className="text-text-muted/60 font-medium">(Optional)</span>
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full bg-bg-card/50 px-3.5 py-2.5 rounded-xl border border-border-card text-text-primary placeholder-text-muted/50 focus:border-accent-teal outline-none text-xs font-semibold"
              placeholder="e.g. flickering happens mostly on dark rainy evenings, or near the storm grate..."
              id="additional-note-input"
            />
          </div>

          {/* Submission Feedback & Submit */}
          {errorMsg && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-xs text-rose-500">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-semibold">{errorMsg}</span>
            </div>
          )}

          {isSubmitting && uploadProgress !== null && (
            <div className="p-3.5 bg-bg-card/60 border border-border-card rounded-xl space-y-2" id="submission-progress-bar">
              <div className="flex justify-between text-[10px] font-bold text-text-secondary uppercase tracking-wider">
                <span>
                  {uploadProgress === 20 && "20% photo compressed"}
                  {uploadProgress === 60 && "60% AI analysis done"}
                  {uploadProgress === 100 && "100% Google Sheets saved"}
                  {uploadProgress !== 20 && uploadProgress !== 60 && uploadProgress !== 100 && `${uploadProgress}% processing...`}
                </span>
                <span className="text-accent-teal font-black">{uploadProgress}%</span>
              </div>
              <div className="w-full bg-slate-500/20 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-accent-teal h-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <div className="pt-2">
            {currentUser ? (
              <button
                type="submit"
                disabled={isSubmitting || !photoPreview}
                className={`w-full text-white font-bold py-3 px-4 rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer transform hover:-translate-y-0.5 active:scale-98 ${
                  !photoPreview
                    ? "bg-slate-500/20 text-text-muted cursor-not-allowed border border-border-card"
                    : isSubmitting
                    ? "bg-accent-teal/80 cursor-wait"
                    : "bg-accent-teal hover:bg-accent-teal-hover active:bg-accent-teal"
                }`}
                id="submit-report-button"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white border-t-transparent animate-spin"></div>
                    <span>
                      {uploadProgress !== null && uploadProgress < 100
                        ? `Saving Report (${uploadProgress}%)...`
                        : "Registering Civic Report..."}
                    </span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Report to Community Hub</span>
                  </>
                )}
              </button>
            ) : (
              <div className="bg-bg-card/45 border border-border-card rounded-2xl p-5 text-center space-y-3">
                <p className="text-xs text-text-secondary font-semibold leading-relaxed">
                  You must be authenticated with Google to register an official report. Your citizen profile email and picture will be securely logged.
                </p>
                <button
                  type="button"
                  onClick={openLoginModal}
                  className="inline-flex items-center gap-2 bg-accent-teal hover:bg-accent-teal-hover text-white font-bold text-xs px-5 py-2.5 rounded-xl transition-all cursor-pointer shadow-md transform hover:-translate-y-0.5 active:scale-98"
                  id="unauth-login-trigger"
                >
                  <Camera className="w-4.5 h-4.5" />
                  <span>Sign In & Report Anomaly</span>
                </button>
              </div>
            )}
          </div>
        </form>
      </div>
      )}
    </div>
  );
}
