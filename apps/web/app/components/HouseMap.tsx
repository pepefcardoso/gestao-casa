"use client";

import type React from "react";
import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface HouseMapProps {
  latitude: number | null;
  longitude: number | null;
  onChange?: (lat: number, lng: number) => void;
  interactive?: boolean;
}

export default function HouseMap({
  latitude,
  longitude,
  onChange,
  interactive = false,
}: HouseMapProps): React.JSX.Element {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  // Default coordinate centered in São Paulo, Brazil if none is provided
  const defaultCenter: [number, number] = [-23.55052, -46.633308];
  const initialCenter: [number, number] =
    latitude !== null && longitude !== null
      ? [latitude, longitude]
      : defaultCenter;

  const initialZoom = latitude !== null && longitude !== null ? 15 : 4;

  // biome-ignore lint/correctness/useExhaustiveDependencies: Initialize map container once on mount
  useEffect((): (() => void) => {
    if (!mapContainerRef.current) return (): void => {};

    // Initialize Leaflet Map
    const map = L.map(mapContainerRef.current, {
      center: initialCenter,
      zoom: initialZoom,
      dragging: interactive,
      zoomControl: interactive,
      scrollWheelZoom: interactive,
      doubleClickZoom: interactive,
      boxZoom: interactive,
      keyboard: interactive,
    });
    mapRef.current = map;

    // Use standard OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map);

    // Custom map pin using SVG and Tailwind
    const customIcon = L.divIcon({
      html: `
        <div class="text-emerald-600 drop-shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3" fill="white"/>
          </svg>
        </div>
      `,
      className: "custom-div-icon",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    // Add marker if initial coordinates are present
    if (latitude !== null && longitude !== null) {
      const marker = L.marker([latitude, longitude], { icon: customIcon }).addTo(map);
      markerRef.current = marker;
    }

    // Set up click handler in interactive mode
    if (interactive && onChange) {
      map.on("click", (e: L.LeafletMouseEvent): void => {
        const { lat, lng } = e.latlng;
        const fixedLat = Number(lat.toFixed(6));
        const fixedLng = Number(lng.toFixed(6));

        if (markerRef.current) {
          markerRef.current.setLatLng([fixedLat, fixedLng]);
        } else {
          const newMarker = L.marker([fixedLat, fixedLng], { icon: customIcon }).addTo(map);
          markerRef.current = newMarker;
        }

        onChange(fixedLat, fixedLng);
      });
    }

    return (): void => {
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, [interactive]); // Runs once on initial mount

  // Watch for coordinate updates from inputs (external state changes)
  useEffect((): void => {
    const map = mapRef.current;
    if (!map) return;

    const customIcon = L.divIcon({
      html: `
        <div class="text-emerald-600 drop-shadow-md">
          <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="currentColor" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-map-pin">
            <path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0Z"/>
            <circle cx="12" cy="10" r="3" fill="white"/>
          </svg>
        </div>
      `,
      className: "custom-div-icon",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
    });

    if (latitude !== null && longitude !== null) {
      const targetLatLng: [number, number] = [latitude, longitude];

      if (markerRef.current) {
        markerRef.current.setLatLng(targetLatLng);
      } else {
        const newMarker = L.marker(targetLatLng, { icon: customIcon }).addTo(map);
        markerRef.current = newMarker;
      }

      // Pan view to new position
      map.setView(targetLatLng, map.getZoom());
    } else {
      // Clear marker if coordinates are removed
      if (markerRef.current) {
        markerRef.current.remove();
        markerRef.current = null;
      }
    }
  }, [latitude, longitude]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-full min-h-[300px] rounded-lg border border-mint-slate-400/20"
      style={{ zIndex: 1 }}
    />
  );
}
