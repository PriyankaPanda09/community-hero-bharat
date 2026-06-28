import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import { CivicIssue, IssueStatus, isDemoIssue } from "../types";
import { MapPin, Calendar, Sparkles, AlertTriangle, Locate, Navigation, Loader2, X } from "lucide-react";

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
  const userMarkerRef = useRef<L.Marker | null>(null);

  const [userAddress, setUserAddress] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [hasUserMarker, setHasUserMarker] = useState(false);
  const dismissTimeoutRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (dismissTimeoutRef.current) {
        clearTimeout(dismissTimeoutRef.current);
      }
    };
  }, []);

  const handleLocateUser = () => {
    if (userMarkerRef.current) {
      userMarkerRef.current.remove();
      userMarkerRef.current = null;
      setHasUserMarker(false);
      setUserAddress(null);
      setShowInfo(false);
      setIsLocating(false);
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
      return;
    }

    if (!navigator.geolocation) {
      setLocationError("Geolocation is not supported by your browser.");
      setShowInfo(true);
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
      dismissTimeoutRef.current = setTimeout(() => {
        setShowInfo(false);
      }, 5000);
      return;
    }

    setIsLocating(true);
    setLocationError(null);
    setUserAddress(null);
    setShowInfo(true);
    if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Center map to user position and zoom in
        if (mapInstanceRef.current) {
          mapInstanceRef.current.setView([latitude, longitude], 16, { animate: true });
        }

        let addressText = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;

        // Reverse geocode user coordinates using Nominatim API with User-Agent
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json&accept-language=en`,
            {
              headers: {
                "User-Agent": "CommunityHero/1.0",
              },
            }
          );
          if (res.ok) {
            const data = await res.json();
            if (data && data.display_name) {
              addressText = data.display_name;
            }
          }
        } catch (err) {
          console.error("Reverse geocoding error in map locator:", err);
        }

        setUserAddress(addressText);
        setIsLocating(false);

        // Auto-dismiss after 5 seconds
        if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = setTimeout(() => {
          setShowInfo(false);
        }, 5000);

        // Update user marker on map
        if (mapInstanceRef.current) {
          // Remove previous user marker if any
          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
          }

          // Create custom user icon with a person/human standing flat SVG inside a white circle with blue border & pulse effect (noticeably larger, glowing, and positioned on top)
          const userIcon = L.divIcon({
            className: "custom-user-marker",
            html: `
              <div class="relative w-16 h-16 flex items-center justify-center">
                <!-- Glowing Pulsing Rings (Multiple for rich look) -->
                <div class="absolute w-14 h-14 rounded-full bg-blue-400/40 animate-ping" style="animation-duration: 2.5s; filter: blur(1px);"></div>
                <div class="absolute w-16 h-16 rounded-full bg-blue-500/20 animate-pulse" style="animation-duration: 1.5s; filter: blur(3px);"></div>
                
                <!-- Main Badge Shield -->
                <div class="relative w-11 h-11 rounded-full bg-white border-3 border-blue-600 flex items-center justify-center shadow-[0_0_15px_rgba(37,99,235,0.6)]">
                  <div class="w-8.5 h-8.5 rounded-full bg-blue-50 flex items-center justify-center">
                    <svg class="w-6 h-6 text-blue-600 animate-pulse" style="animation-duration: 2s;" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2c1.1 0 2 .9 2 2s-.9 2-2 2-2-.9-2-2 .9-2 2-2zm2 19v-6h2V9c0-1.1-.9-2-2-2H10c-1.1 0-2 .9-2 2v6h2v6h4z" />
                    </svg>
                  </div>
                </div>
                
                <!-- Pointer triangle pointing precisely to the location -->
                <div class="absolute bottom-2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[8px] border-t-blue-600 drop-shadow-md"></div>
              </div>
            `,
            iconSize: [64, 64],
            iconAnchor: [32, 54],
            popupAnchor: [0, -48],
          });

          const uMarker = L.marker([latitude, longitude], { 
            icon: userIcon,
            zIndexOffset: 10000 
          }).addTo(mapInstanceRef.current);
          uMarker.bindPopup(`
            <div class="p-1.5 text-slate-800 font-sans text-center max-w-[200px] space-y-1.5">
              <p class="text-xs font-black text-blue-600 uppercase tracking-wider m-0">You are here</p>
              <p class="text-[10px] text-slate-500 font-bold mt-1 leading-normal">${addressText}</p>
              <button 
                class="leaflet-remove-user-marker-btn w-full mt-1.5 py-1 px-2 bg-slate-800 hover:bg-slate-700 text-white font-extrabold text-[9px] uppercase tracking-wider rounded-lg border border-white/5 cursor-pointer transition-colors"
                style="border: none; outline: none; margin: 4px 0 0 0;"
              >
                Remove Pin
              </button>
            </div>
          `).openPopup();

          userMarkerRef.current = uMarker;
          setHasUserMarker(true);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorStr = "Unable to retrieve your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorStr = "Location access denied — enable it in browser settings to use this feature";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorStr = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          errorStr = "The request to get user location timed out.";
        }
        setLocationError(errorStr);
        setIsLocating(false);

        // Auto-dismiss after 5 seconds
        if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
        dismissTimeoutRef.current = setTimeout(() => {
          setShowInfo(false);
        }, 5000);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

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

    // Window resize listener to keep Leaflet map fully responsive
    const handleResize = () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.invalidateSize();
      }
    };
    window.addEventListener("resize", handleResize);

    return () => {
      // Clean up map instance and event listener on unmount
      window.removeEventListener("resize", handleResize);
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersLayerRef.current = null;
      }
    };
  }, []);

  // 2. Repopulate markers when issues change (with simple proximity clustering)
  useEffect(() => {
    const map = mapInstanceRef.current;
    const markersLayer = markersLayerRef.current;
    if (!map || !markersLayer) return;

    // Clear existing markers
    markersLayer.clearLayers();

    if (validIssues.length === 0) return;

    // Proximity grouping (approx 15-20 meters)
    const groups: CivicIssue[][] = [];
    validIssues.forEach((issue) => {
      let added = false;
      for (const group of groups) {
        const first = group[0];
        const latDiff = Math.abs(first.location.lat - issue.location.lat);
        const lngDiff = Math.abs(first.location.lng - issue.location.lng);
        if (latDiff < 0.00015 && lngDiff < 0.00015) {
          group.push(issue);
          added = true;
          break;
        }
      }
      if (!added) {
        groups.push([issue]);
      }
    });

    // Add grouped markers
    groups.forEach((group) => {
      if (group.length === 1) {
        const issue = group[0];
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
            <div class="absolute top-1 right-1 flex items-center gap-1">
              ${issue.isEscalated ? `
                <span class="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-600 text-white animate-pulse" style="margin:0;">
                  ⚠️ Urgent
                </span>
              ` : ''}
              <span class="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow-sm ${statusBg}" style="margin:0;">
                ${issue.status}
              </span>
              ${issue.confirmationCount && issue.confirmationCount > 0 ? `
                <span class="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950" style="margin:0;">
                  👥 ${issue.confirmationCount}
                </span>
              ` : ''}
            </div>
           </div>`
        : `<div class="w-full h-14 rounded-lg border border-slate-100 flex items-center justify-center bg-slate-50 text-[10px] font-bold text-slate-400 mb-2 relative">
            <span style="margin-left:-40px;">No photo</span>
            <div class="absolute top-1.5 right-1 flex items-center gap-1">
              ${issue.isEscalated ? `
                <span class="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-red-600 text-white animate-pulse" style="margin:0;">
                  ⚠️ Urgent
                </span>
              ` : ''}
              <span class="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full shadow-sm ${statusBg}" style="margin:0;">
                ${issue.status}
              </span>
              ${issue.confirmationCount && issue.confirmationCount > 0 ? `
                <span class="text-[8px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-500 text-slate-950" style="margin:0;">
                  👥 ${issue.confirmationCount}
                </span>
              ` : ''}
            </div>
           </div>`;

      const dateStr = new Date(issue.timestamp).toLocaleDateString([], { month: "short", day: "numeric" });
      const demoBadgeHtml = isDemoIssue(issue)
        ? `<div class="bg-amber-500/10 text-amber-700 border border-amber-500/20 rounded-md p-1 text-[9px] font-bold text-center leading-tight" style="margin: 4px 0;">
             ⚠️ Simulated Demo Report
           </div>`
        : '';

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
          ${demoBadgeHtml}

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
      } else {
        // Multiple issues at very close location -> cluster marker
        const avgLat = group.reduce((acc, i) => acc + i.location.lat, 0) / group.length;
        const avgLng = group.reduce((acc, i) => acc + i.location.lng, 0) / group.length;

        const clusterIcon = L.divIcon({
          className: "custom-leaflet-cluster-marker",
          html: `
            <div class="relative w-10 h-10 flex items-center justify-center">
              <div class="absolute inset-0 rounded-full bg-teal-500/20 animate-pulse"></div>
              <div class="absolute w-8 h-8 rounded-full bg-white border-2 border-slate-900 shadow-lg flex items-center justify-center">
                <div class="w-6.5 h-6.5 rounded-full bg-slate-900 flex items-center justify-center">
                  <span class="text-xs font-black text-white">${group.length}</span>
                </div>
              </div>
              <div class="absolute -bottom-1 w-0 h-0 border-l-4 border-l-transparent border-r-4 border-r-transparent border-t-5 border-t-slate-900"></div>
            </div>
          `,
          iconSize: [40, 40],
          iconAnchor: [20, 40],
          popupAnchor: [0, -40],
        });

        const marker = L.marker([avgLat, avgLng], { icon: clusterIcon }).addTo(markersLayer);

        let popupContent = `
          <div class="p-1 w-[260px] text-slate-800 space-y-2.5 font-sans" id="popup-cluster">
            <div class="border-b border-slate-100 pb-2">
              <h4 class="text-xs font-black text-slate-900 flex items-center gap-1.5 uppercase tracking-wider m-0">
                <span>📍</span>
                <span>${group.length} Issues at Location</span>
              </h4>
            </div>
            <div class="max-h-[240px] overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        `;

        group.forEach((issue) => {
          const categoryLabel = CATEGORY_LABELS[issue.category] || "Other Grievance";
          const categoryEmoji = CATEGORY_EMOJIS[issue.category] || "🛠️";
          
          let statusBg = "bg-rose-500 text-white";
          if (issue.status === "In Progress") {
            statusBg = "bg-amber-500 text-slate-950";
          } else if (issue.status === "Resolved") {
            statusBg = "bg-emerald-500 text-white";
          }

          const severityClass =
            issue.severity === "high"
              ? "bg-rose-500/10 text-rose-600 border border-rose-500/20"
              : issue.severity === "medium"
              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
              : "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20";

          popupContent += `
            <div class="p-2 rounded-xl bg-slate-50 border border-slate-100/80 hover:bg-slate-100/50 transition-colors space-y-1.5">
              <div class="flex items-center justify-between gap-1">
                <span class="text-[11px] font-extrabold text-slate-950 flex items-center gap-1 truncate max-w-[140px]">
                  <span>${categoryEmoji}</span>
                  <span>${categoryLabel}</span>
                </span>
                <div class="flex items-center gap-0.5 shrink-0">
                  <span class="text-[7px] font-black uppercase px-1 py-0.5 rounded-md ${severityClass}">
                    ${issue.severity}
                  </span>
                  <span class="text-[7px] font-black uppercase px-1 py-0.5 rounded-md ${statusBg}">
                    ${issue.status === "In Progress" ? "InPrg" : issue.status}
                  </span>
                </div>
              </div>
              <p class="text-[10px] text-slate-600 leading-snug line-clamp-2 italic font-semibold m-0">
                "${issue.description}"
              </p>
              <div class="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/50">
                <span class="text-[8px] text-slate-400 font-bold">
                  Ref: ${issue.id.slice(0, 6)}
                </span>
                <button
                  class="leaflet-view-details-btn inline-flex items-center gap-0.5 bg-teal-600 hover:bg-teal-700 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md shadow-xs transition-colors cursor-pointer"
                  data-issue-id="${issue.id}"
                  style="border: none; outline: none; margin: 0;"
                >
                  <span>View &rarr;</span>
                </button>
              </div>
            </div>
          `;
        });

        popupContent += `
            </div>
          </div>
        `;

        marker.bindPopup(popupContent, {
          maxWidth: 280,
          className: "custom-leaflet-popup",
        });
      }
    });

    // Auto fit map bounds to cover all markers
    try {
      const bounds = L.latLngBounds(validIssues.map((i) => [i.location.lat, i.location.lng]));
      map.fitBounds(bounds.pad(0.15));
    } catch (e) {
      console.warn("Failed to set bounds:", e);
    }
  }, [validIssues]);

  // 3. Listen to popup opens to attach click events to the detail buttons and remove user marker button
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    const handlePopupOpen = (e: L.PopupEvent) => {
      const container = e.popup.getElement();
      if (!container) return;

      // Attach click handlers to any view details buttons inside the popup (handles single and cluster popup)
      const detailBtns = container.querySelectorAll(".leaflet-view-details-btn");
      detailBtns.forEach((btn) => {
        const handleBtnClick = () => {
          const issueId = btn.getAttribute("data-issue-id");
          if (issueId) {
            onSelectIssue(issueId);
          }
        };
        btn.addEventListener("click", handleBtnClick);
        (btn as any)._handleClick = handleBtnClick;
      });

      // Attach click handler to remove user location button inside the popup
      const removeUserBtn = container.querySelector(".leaflet-remove-user-marker-btn");
      if (removeUserBtn) {
        const handleRemoveUser = () => {
          if (userMarkerRef.current) {
            userMarkerRef.current.remove();
            userMarkerRef.current = null;
          }
          setHasUserMarker(false);
          setUserAddress(null);
          setShowInfo(false);
        };
        removeUserBtn.addEventListener("click", handleRemoveUser);
        (removeUserBtn as any)._handleRemove = handleRemoveUser;
      }
    };

    const handlePopupClose = (e: L.PopupEvent) => {
      const container = e.popup.getElement();
      if (!container) return;

      const detailBtns = container.querySelectorAll(".leaflet-view-details-btn");
      detailBtns.forEach((btn) => {
        if (btn && (btn as any)._handleClick) {
          btn.removeEventListener("click", (btn as any)._handleClick);
          delete (btn as any)._handleClick;
        }
      });

      const removeUserBtn = container.querySelector(".leaflet-remove-user-marker-btn");
      if (removeUserBtn && (removeUserBtn as any)._handleRemove) {
        removeUserBtn.removeEventListener("click", (removeUserBtn as any)._handleRemove);
        delete (removeUserBtn as any)._handleRemove;
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
        .custom-user-marker {
          background: none !important;
          border: none !important;
        }
      `}</style>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-accent-teal/10 border border-accent-teal/20 flex items-center justify-center text-accent-teal shrink-0 relative overflow-hidden shadow-xs">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--accent-teal),0.15),transparent_70%)] animate-pulse" />
            <MapPin className="w-5.5 h-5.5 text-accent-teal animate-bounce" style={{ animationDuration: "2.5s" }} />
          </div>
          <div>
            <h2 className="text-2xl font-display font-extrabold text-text-primary tracking-tight">
              Interactive Grievance Map
            </h2>
            <p className="text-xs text-text-secondary mt-0.5 font-medium">
              Visualize reported potholes, broken streetlights, and garbage dumps in real-time.
            </p>
          </div>
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
        className="w-full rounded-3xl border border-border-card overflow-hidden shadow-xl bg-slate-900/10 relative z-10 h-[380px] sm:h-[550px]" 
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

        {/* Floating Locator Controls */}
        <div className="absolute top-4 right-4 z-[500] flex flex-col items-end gap-2 max-w-[calc(100%-2rem)] sm:max-w-xs" id="map-locator-control-group">
          {/* Geolocation trigger button */}
          <button
            onClick={handleLocateUser}
            disabled={isLocating}
            className="bg-slate-900/95 hover:bg-slate-800 text-accent-teal hover:text-white p-3 rounded-full border border-white/10 shadow-2xl transition-all cursor-pointer flex items-center justify-center hover:scale-105 active:scale-95 disabled:opacity-50"
            title="Find my location"
            id="locate-me-btn"
          >
            {isLocating ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <Locate className="w-5 h-5 text-accent-teal" />
            )}
          </button>

          {/* Address display box or geolocation error message box */}
          {showInfo && (userAddress || locationError || isLocating) && (
            <div className="bg-slate-900/95 border border-white/10 rounded-2xl p-3.5 shadow-2xl text-left backdrop-blur-md animate-fade-in max-w-full relative pr-8" id="map-locator-info-box">
              {/* Manual close button */}
              <button
                onClick={() => {
                  setShowInfo(false);
                  if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current);
                }}
                className="absolute top-2 right-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-full p-1 transition-all cursor-pointer"
                title="Dismiss"
                id="close-locator-info-btn"
              >
                <X className="w-3.5 h-3.5" />
              </button>

              {isLocating ? (
                <div className="flex items-center gap-2.5">
                  <Loader2 className="w-4 h-4 text-accent-teal animate-spin shrink-0" />
                  <p className="text-[11px] text-slate-200 font-semibold leading-relaxed">
                    Determining your current location...
                  </p>
                </div>
              ) : locationError ? (
                <div className="flex items-start gap-2.5 pr-1">
                  <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                  <p className="text-[10px] text-rose-300 font-bold leading-normal">
                    {locationError}
                  </p>
                </div>
              ) : (
                <div className="flex items-start gap-2.5 pr-1">
                  <Navigation className="w-4 h-4 text-accent-teal shrink-0 mt-0.5 animate-pulse" />
                  <div className="space-y-0.5">
                    <p className="text-[9px] uppercase font-black tracking-widest text-accent-teal">
                      You are near:
                    </p>
                    <p className="text-[11px] text-white font-semibold leading-relaxed">
                      {userAddress}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        <div 
          ref={mapContainerRef} 
          className="w-full h-full"
          style={{ minHeight: "100%" }}
        />
      </div>
    </div>
  );
}
