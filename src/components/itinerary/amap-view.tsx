"use client";

import { useEffect, useRef, useState, useCallback } from "react";

export interface AmapPlace {
  placeId: string;
  name: string;
  lat: number | null;
  lng: number | null;
}

interface AmapViewProps {
  places: AmapPlace[];
  selectedPlaceId: string | null;
  onSelectPlace: (placeId: string) => void;
  onFallback?: (reason: string) => void;
}

interface AMapMapInstance {
  clearMap(): void;
  destroy(): void;
  add(overlay: unknown): void;
  panTo(position: [number, number]): void;
  setFitView(
    overlays?: unknown[] | null,
    immediately?: boolean,
    avoid?: [number, number, number, number],
  ): void;
}

interface AMapMarkerInstance {
  on(event: string, handler: () => void): void;
}

interface AMapNamespace {
  Map: new (
    container: HTMLElement,
    options: Record<string, unknown>,
  ) => AMapMapInstance;
  Marker: new (options: Record<string, unknown>) => AMapMarkerInstance;
  Pixel: new (x: number, y: number) => unknown;
  Polyline: new (options: Record<string, unknown>) => unknown;
}

declare global {
  interface Window {
    AMap?: AMapNamespace;
    _AMapSecurityConfig?: {
      securityJsCode?: string;
    };
  }
}

export function AmapView({
  places,
  selectedPlaceId,
  onSelectPlace,
  onFallback,
}: AmapViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<AMapMapInstance | null>(null);

  const amapKey = process.env.NEXT_PUBLIC_AMAP_KEY;
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">(() =>
    amapKey ? "loading" : "error",
  );
  const [errorMessage, setErrorMessage] = useState<string>(() =>
    amapKey ? "" : "未配置 NEXT_PUBLIC_AMAP_KEY",
  );

  const validPlaces = places.filter(
    (p): p is AmapPlace & { lat: number; lng: number } =>
      typeof p.lat === "number" &&
      typeof p.lng === "number" &&
      !isNaN(p.lat) &&
      !isNaN(p.lng),
  );

  const renderMarkersAndRoutes = useCallback(
    (map: AMapMapInstance, AMap: AMapNamespace) => {
      map.clearMap();

      if (validPlaces.length === 0) return;

      const markers: unknown[] = [];
      const pathCoords: [number, number][] = [];

      validPlaces.forEach((place, index) => {
        const position: [number, number] = [place.lng, place.lat];
        pathCoords.push(position);

        const markerContent = document.createElement("div");
        markerContent.className = "custom-amap-marker";
        markerContent.innerHTML = `
          <div style="
            display: flex;
            align-items: center;
            justify-content: center;
            width: 26px;
            height: 26px;
            background-color: #a63a2f;
            color: #f7f0ea;
            font-family: Songti SC, Noto Serif SC, serif;
            font-weight: 600;
            font-size: 13px;
            border-radius: 2px;
            box-shadow: 0 2px 4px rgba(43, 46, 42, 0.25);
            cursor: pointer;
            border: 1px solid #f6f1e7;
            transition: transform 0.15s ease;
          ">
            ${index + 1}
          </div>
          <div style="
            position: absolute;
            top: 28px;
            left: 50%;
            transform: translateX(-50%);
            white-space: nowrap;
            font-size: 12px;
            color: #2b2e2a;
            background: rgba(250, 246, 238, 0.92);
            border: 1px solid #ddd5c6;
            border-radius: 2px;
            padding: 1px 6px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
            pointer-events: none;
            font-family: Songti SC, Noto Serif SC, serif;
          ">
            ${place.name.length > 7 ? place.name.slice(0, 7) + "…" : place.name}
          </div>
        `;

        const marker = new AMap.Marker({
          position,
          content: markerContent,
          offset: new AMap.Pixel(-13, -13),
          title: place.name,
        });

        marker.on("click", () => {
          onSelectPlace(place.placeId);
        });

        map.add(marker);
        markers.push(marker);
      });

      if (pathCoords.length > 1) {
        const polyline = new AMap.Polyline({
          path: pathCoords,
          isOutline: true,
          outlineColor: "#ffffff",
          borderWeight: 1,
          strokeColor: "#34584e",
          strokeOpacity: 0.85,
          strokeWeight: 4,
          strokeStyle: "solid",
          lineJoin: "round",
          lineCap: "round",
        });
        map.add(polyline);
      }

      setTimeout(() => {
        try {
          map.setFitView(null, false, [35, 35, 35, 35]);
        } catch {}
      }, 150);
    },
    [validPlaces, onSelectPlace],
  );

  const placesSignature = places
    .map((p) => `${p.placeId}:${p.lat},${p.lng}`)
    .join("|");

  useEffect(() => {
    if (!amapKey) {
      return;
    }

    const securityCode = process.env.NEXT_PUBLIC_AMAP_SECURITY_CODE;
    if (securityCode && typeof window !== "undefined") {
      window._AMapSecurityConfig = {
        securityJsCode: securityCode,
      };
    }

    let isSubscribed = true;
    let timeoutTimer: NodeJS.Timeout | null = null;

    const initMap = (AMap: AMapNamespace) => {
      if (!isSubscribed || !containerRef.current) return;

      try {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.destroy();
          mapInstanceRef.current = null;
        }

        const map = new AMap.Map(containerRef.current, {
          zoom: 12,
          mapStyle: "amap://styles/whitesmoke",
          viewMode: "2D",
        });
        mapInstanceRef.current = map;

        renderMarkersAndRoutes(map, AMap);
        setLoadState("ready");
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "地图初始化异常";
        setErrorMessage(msg);
        setLoadState("error");
        onFallback?.(msg);
      }
    };

    if (window.AMap) {
      initMap(window.AMap);
    } else {
      const scriptId = "amap-webapi-script";
      let script = document.getElementById(scriptId) as HTMLScriptElement | null;

      if (!script) {
        script = document.createElement("script");
        script.id = scriptId;
        script.type = "text/javascript";
        script.src = `https://webapi.amap.com/maps?v=2.0&key=${amapKey}&plugin=AMap.Polyline,AMap.Marker`;
        script.async = true;

        script.onload = () => {
          if (timeoutTimer) clearTimeout(timeoutTimer);
          if (window.AMap) {
            initMap(window.AMap);
          } else {
            const msg = "高德地图 SDK 加载异常";
            setErrorMessage(msg);
            setLoadState("error");
            onFallback?.(msg);
          }
        };

        script.onerror = () => {
          if (timeoutTimer) clearTimeout(timeoutTimer);
          const msg = "高德地图加载失败（网络受限或 Key 无效）";
          setErrorMessage(msg);
          setLoadState("error");
          onFallback?.(msg);
        };

        document.head.appendChild(script);

        timeoutTimer = setTimeout(() => {
          setLoadState((current) => {
            if (current === "loading") {
              const msg = "地图加载超时，已切换至拓扑示意模式";
              setErrorMessage(msg);
              onFallback?.(msg);
              return "error";
            }
            return current;
          });
        }, 8000);
      } else {
        const checkInterval = setInterval(() => {
          if (window.AMap) {
            clearInterval(checkInterval);
            initMap(window.AMap);
          }
        }, 100);
        return () => clearInterval(checkInterval);
      }
    }

    return () => {
      isSubscribed = false;
      if (timeoutTimer) clearTimeout(timeoutTimer);
      if (mapInstanceRef.current) {
        try {
          mapInstanceRef.current.destroy();
        } catch {}
        mapInstanceRef.current = null;
      }
    };
  }, [amapKey, placesSignature, onFallback, renderMarkersAndRoutes]);

  useEffect(() => {
    if (!mapInstanceRef.current || !selectedPlaceId) return;
    const targetPlace = validPlaces.find((p) => p.placeId === selectedPlaceId);
    if (
      targetPlace &&
      typeof targetPlace.lat === "number" &&
      typeof targetPlace.lng === "number"
    ) {
      try {
        mapInstanceRef.current.panTo([targetPlace.lng, targetPlace.lat]);
      } catch {}
    }
  }, [selectedPlaceId, validPlaces]);

  return (
    <div className="relative h-full w-full">
      {loadState === "loading" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/85 backdrop-blur-[1px]">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-2 text-sm font-medium tracking-wide text-muted">
            正在载入高德真实地图…
          </p>
        </div>
      )}

      {loadState === "error" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-surface/90 p-4 text-center">
          <p className="text-sm font-medium text-danger">{errorMessage}</p>
          <p className="mt-1 text-xs text-muted">
            已为您切换至轻量自适应拓扑图
          </p>
        </div>
      )}

      <div
        ref={containerRef}
        className="h-full w-full"
        style={{ minHeight: "18rem" }}
      />
    </div>
  );
}
