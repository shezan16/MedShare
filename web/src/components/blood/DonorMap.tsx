'use client';

import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import 'leaflet/dist/leaflet.css';
import { MapPin, Navigation, Info } from 'lucide-react';

interface DonorMarkerData {
  id: string;
  displayName: string;
  bloodGroup: string;
  approxDistanceKm: number;
  isAvailable: boolean;
  isVerified: boolean;
  approxLocation: {
    lat: number;
    lng: number;
  };
}

interface DonorMapProps {
  hospitalLat?: number;
  hospitalLng?: number;
  hospitalName?: string;
  radiusKm?: number;
  donors?: DonorMarkerData[];
  onRadiusChange?: (newRadius: number) => void;
  interactive?: boolean;
}

// Client-only map wrapper to prevent Leaflet SSR issues
function InternalMap({
  hospitalLat = 40.7516,
  hospitalLng = -73.9754,
  hospitalName = 'Metropolitan Trauma Center',
  radiusKm = 5.0,
  donors = [],
  interactive = true,
}: DonorMapProps) {
  const [L, setL] = useState<any>(null);
  const [mapInstance, setMapInstance] = useState<any>(null);

  useEffect(() => {
    import('leaflet').then((leaflet) => {
      setL(leaflet.default);
    });
  }, []);

  useEffect(() => {
    if (!L) return;

    // Reset default icon URLs for Leaflet in Webpack/Next.js
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });

    const container = document.getElementById('medshare-map');
    if (!container) return;

    // Remove existing map if any
    if (mapInstance) {
      mapInstance.remove();
    }

    const map = L.map('medshare-map').setView([hospitalLat, hospitalLng], 13);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors | MedShare RapidBlood',
      maxZoom: 18,
    }).addTo(map);

    // Custom Hospital Icon (Red)
    const hospitalIcon = L.divIcon({
      className: 'custom-hospital-marker',
      html: `
        <div style="background-color: #EF4444; width: 36px; height: 36px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 10px rgba(239, 68, 68, 0.4); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold; font-size: 16px;">
          🏥
        </div>
      `,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });

    // Add Hospital Marker
    L.marker([hospitalLat, hospitalLng], { icon: hospitalIcon })
      .addTo(map)
      .bindPopup(
        `<div style="font-family: sans-serif; font-size: 12px; padding: 4px;">
          <strong style="color: #EF4444; font-size: 13px;">${hospitalName}</strong><br/>
          <span>Emergency Request Center</span>
        </div>`
      )
      .openPopup();

    // Radius Circle
    L.circle([hospitalLat, hospitalLng], {
      color: '#3B82F6',
      fillColor: '#3B82F6',
      fillOpacity: 0.1,
      weight: 2,
      radius: radiusKm * 1000,
    }).addTo(map);

    // Add Approximate Donor Markers
    donors.forEach((donor) => {
      const donorIcon = L.divIcon({
        className: 'custom-donor-marker',
        html: `
          <div style="background-color: ${donor.isVerified ? '#10B981' : '#3B82F6'}; width: 28px; height: 28px; border-radius: 50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.2); display: flex; align-items: center; justify-content: center; color: white; font-size: 10px; font-weight: bold;">
            ${donor.bloodGroup.replace('_', '')}
          </div>
        `,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      L.marker([donor.approxLocation.lat, donor.approxLocation.lng], { icon: donorIcon })
        .addTo(map)
        .bindPopup(
          `<div style="font-family: sans-serif; font-size: 12px; padding: 4px;">
            <strong style="color: #0F172A;">${donor.displayName}</strong><br/>
            <span>Blood Group: <strong>${donor.bloodGroup.replace('_', '')}</strong></span><br/>
            <span>Distance: <strong>~${donor.approxDistanceKm} km</strong></span><br/>
            <span style="font-size: 10px; color: #64748B;">*Approximate location for donor privacy</span>
          </div>`
        );
    });

    setMapInstance(map);

    return () => {
      map.remove();
    };
  }, [L, hospitalLat, hospitalLng, radiusKm, donors]);

  return (
    <div className="relative w-full h-[400px] rounded-xl overflow-hidden border border-slate-200 shadow-sm">
      <div id="medshare-map" className="w-full h-full" />
      {/* Privacy note badge */}
      <div className="absolute bottom-2 left-2 z-[400] bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-md text-[10px] text-slate-600 border border-slate-200/80 shadow-sm flex items-center gap-1">
        <Info className="w-3 h-3 text-blue-500" />
        <span>Donor coordinates perturbed ~300m for privacy</span>
      </div>
    </div>
  );
}

export default function DonorMap(props: DonorMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[400px] rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 text-xs">
        Loading Geolocation Map...
      </div>
    );
  }

  return <InternalMap {...props} />;
}
