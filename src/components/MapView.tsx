import React, { useEffect, useRef } from "react";
import L from "leaflet";
import { CivicIssue, IssueStatus } from "../types";
import { MapPin, Calendar, Sparkles, AlertTriangle } from "lucide-react";

interface MapViewProps {
  issues: CivicIssue[];
  onSelectIssue: (issueId: string) => void;
}

const CATEGORY_LABELS: Record<string, string> = {
  pothole: "Pothole",
  streetlight: "Streetlight",
  garbage: "Garbage Dump",
  water_leak: "Water Leak",
  other: "Other Grievance",
};

const CATEGORY_EMOJIS: Record<string, string> = {
  pothole: "🕳️",
  streetlight: "💡",
  garbage: "🗑️",
  water_leak: "💧",
  other: "🛠️",
};

export default function MapView({ issues, onSelectIssue }: MapViewProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersLayerRef = useRef<L.LayerGroup | null>(null);

  // Filter out issues that do not have valid lat/lng
  const validIssues = issues.filter(
    (issue) =>
      issue.location &&
      typeof issue.location.lat === "number" &&
      typeof issue.location.lng === "number" &&
      !isNaN(issue.location.lat) &&
      !isNaN(issue.location.lng)
  );

  // Default center (Bangalore: 12.9716, 77.5946 or first valid issue)
  const defaultCenter =
    validIssues.length > 0
      ? { lat: validIssues[0].location.lat, lng: validIssues[0].location.lng }
      : { lat: 12.9716, lng: 77.5946 };

  // 1. Initialize map on mount
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create map instance
      const map = L.map(mapContainerRef.current, {
        center: [defaultCenter.lat, defaultCenter.lng],
        zoom: 13,
        zoomControl: true,
        scrollWheelZoom: true,
      });

      // Add high-quality OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(map);

      // Create LayerGroup for markers
      const markersLayer = L.layerGroup().addTo(map);
      markersLayerRef.current = markersLayer;

      mapInstanceRef.current = map;
    }

    return () => {
      // Clean up map instance on unmount
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // 2. Repopulate markers when issues change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Clear existing markers
    markersLayer.clearLayers();

    if (validIssues.length === 0) return;

    // Add new markers
    validIssues.forEach((issue) => {
      const { lat, lng } = issue.location;

      // Color coding configuration
      let pinColorClass = "bg-rose-500 shadow-rose-500/50";
      let statusBg = "bg-rose-500 text-white";
      if (issue.status === "In Progress") {
        pinColorClass = "bg-amber-500 shadow-amber-500/50";
        statusBg = "bg-amber-500 text-slate-950";
      } else if (issue.status === "Resolved") {
        pinColorClass = "bg-emerald-500 shadow-emerald-500/50";
        statusBg = "bg-emerald-500 text-white";
      }

      // Create clean HTML DivIcon instead of standard Leaflet images (avoiding CDN path issues)
      const customIcon = L.divIcon({
        className: "custom-leaflet-marker",
        html: `
          <div class="relative w-8 h-8 flex items-center justify-center">
            <div class="absolute inset-0 rounded-full bg-white border-2 border-slate-900 shadow-md flex items-center justify-center">
              <div class="w-4.5 h-4.5 rounded-full ${pinColorClass} shadow-xs animate-pulse"></div>
            </div>
            <div class="absolute -bottom-1 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-5 border-t-slate-900"></div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
        popupAnchor: [0, -32],
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(markersLayer);

      // Render popup content
      const categoryLabel = CATEGORY_LABELS[issue.category] || "Other Grievance";
      const categoryEmoji = CATEGORY_EMOJIS[issue.category] || "🛠️";
      
      const severityClass =
        issue.severity === "high"
          ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
          : issue.severity === "medium"
          ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
          : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";

      const imageHtml = issue.photoUrl
        ? `<div class="w-full h-24 rounded-lg overflow-hidden border border-slate-100 shadow-xs relative bg-slate-50 mb-2">
            <img src="${issue.photoUrl}" class="w-full h-full object-cover" referrerpolicy="no-referrer" style="margin:0;" />
            <span class="absolute top-1 right-1 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm ${statusBg}">
              ${issue.status}
            </span>
           </div>`
        : `<div class="w-full h-10 rounded-lg border border-slate-100 flex items-center justify-center bg-slate-50 text-[10px] font-bold text-slate-400 mb-2">No photo available</div>`;

      const dateStr = new Date(issue.timestamp).toLocaleDateString([], { month: "short", day: "numeric" });

      const popupContent = `
        <div class="p-1 max-w-[240px] text-slate-800 space-y-2 font-sans" id="popup-${issue.id}">
          ${imageHtml}
          
          <div class="space-y-1">
            <div class="flex items-center justify-between gap-2">
              <span class="text-xs font-black tracking-tight text-slate-900 flex items-center gap-1">
                <span>${categoryEmoji}</span>
                <span>${categoryLabel}</span>
              </span>
              <span class="text-[8px] font-black uppercase px-2 py-0.5 rounded-md ${severityClass}">
                ${issue.severity}
              </span>
            </div>
            
            <p class="text-[10px] text-slate-500 font-bold flex items-center gap-1 m-0">
              <span class="truncate block max-w-[180px]">${issue.location.address}</span>
            </p>
          </div>

          <p class="text-[11px] text-slate-600 leading-relaxed line-clamp-2 italic font-semibold m-0">
            "${issue.description}"
          </p>

          <div class="pt-2 border-t border-slate-100 flex items-center justify-between gap-3" style="margin-top: 8px;">
            <span class="text-[9px] text-slate-400 font-bold">
              Reported ${dateStr}
            </span>
            <button
              class="leaflet-view-details-btn inline-flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white text-[10px] font-bold px-2.5 py-1 rounded-lg shadow-sm transition-colors cursor-pointer"
              data-issue-id="${issue.id}"
              style="border: none; outline: none; margin: 0;"
            >
              <span>View Details &rarr;</span>
            </button>
          </div>
        </div>
      `;

      marker.bindPopup(popupContent, {
        maxWidth: 260,
        className: "custom-leaflet-popup",
      });
    });

    // Auto fit map bounds to cover all markers
    try {
      const bounds = L.latLngBounds(validIssues.map((i) => [i.location.lat, i.location.lng]));
      map.fitBounds(bounds.pad(0.15));
    } catch (e) {
      console.warn("Failed to set bounds:", e);
    }
  }, [validIssues]);

  // 3. Listen to popup opens to attach click events to the "View Details" buttons
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handlePopupOpen = (e: L.PopupEvent) => {
      const container = e.popup.getElement();
      if (!container) return;

      const btn = container.querySelector(".leaflet-view-details-btn");
      if (btn) {
        const handleBtnClick = () => {
          const issueId = btn.getAttribute("data-issue-id");
          if (issueId) {
            onSelectIssue(issueId);
          }
        };
        btn.addEventListener("click", handleBtnClick);
        // Save ref on the button element to clean up
        (btn as any)._handleClick = handleBtnClick;
      }
    };

    const handlePopupClose = (e: L.PopupEvent) => {
      const container = e.popup.getElement();
      if (!container) return;

      const btn = container.querySelector(".leaflet-view-details-btn");
      if (btn && (btn as any)._handleClick) {
        btn.removeEventListener("click", (btn as any)._handleClick);
        delete (btn as any)._handleClick;
      }
    };

    map.on("popupopen", handlePopupOpen);
    map.on("popupclose", handlePopupClose);

    return () => {
      map.off("popupopen", handlePopupOpen);
      map.off("popupclose", handlePopupClose);
    };
  }, [onSelectIssue]);

  return (
    <div className="space-y-6 animate-fade-in" id="map-view-layout">
      {/* Scope-contained Custom Styles for Leaflet Popups to look fully Premium */}
      <style>{`
        .custom-leaflet-popup .leaflet-popup-content-wrapper {
          background: #ffffff !important;
          border-radius: 1.25rem !important;
          padding: 0.35rem !important;
          box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.15), 0 10px 10px -5px rgba(0, 0, 0, 0.08) !important;
          border: 1px solid rgba(0,0,0,0.06);
        }
        .custom-leaflet-popup .leaflet-popup-tip {
          background: #ffffff !important;
          box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1) !important;
        }
        .custom-leaflet-popup .leaflet-popup-close-button {
          top: 8px !important;
          right: 8px !important;
          color: #94a3b8 !important;
          font-size: 16px !important;
          font-weight: bold !important;
        }
        .custom-leaflet-popup .leaflet-popup-close-button:hover {
          color: #0f172a !important;
        }
        .leaflet-container {
          font-family: inherit !important;
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-display font-extrabold text-text-primary tracking-tight flex items-center gap-2">
            <MapPin className="w-6 h-6 text-accent-teal shrink-0 animate-bounce" />
            <span>Interactive Grievance Map</span>
          </h2>
          <p className="text-xs text-text-secondary mt-0.5 font-medium">
            Visualize reported potholes, broken streetlights, and garbage dumps in real-time.
          </p>
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-4 bg-bg-card border border-border-card p-3 rounded-2xl text-[10px] font-black uppercase tracking-wider card-shadow-glow">
          <span className="text-text-muted">Legend:</span>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs"></span>
            <span className="text-text-primary">Open</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs"></span>
            <span className="text-text-primary">In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs"></span>
            <span className="text-text-primary">Resolved</span>
          </div>
          <span className="text-text-muted">|</span>
          <span className="text-accent-teal">{validIssues.length} Plotted Issues</span>
        </div>
      </div>

      {/* Map Container */}
      <div 
        className="w-full rounded-3xl border border-border-card overflow-hidden shadow-xl bg-slate-900/10 relative z-10" 
        style={{ height: "550px" }}
        id="leaflet-map-wrapper"
      >
        {validIssues.length === 0 ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-bg-card/90 text-center p-6 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-center justify-center">
              <AlertTriangle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-lg font-display font-extrabold text-text-primary">No Plotted Issues Found</h3>
              <p className="text-xs text-text-secondary mt-1">There are no reported issues with valid geographic coordinates to map.</p>
            </div>
          </div>
        ) : null}
        
        <div 
          ref={mapContainerRef} 
          className="w-full h-full"
          style={{ minHeight: "100%" }}
        />
      </div>
    </div>
  );
}
