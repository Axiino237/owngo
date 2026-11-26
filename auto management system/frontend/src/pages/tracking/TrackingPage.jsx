import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import {
  RiCompass3Line, RiRefreshLine, RiChargingPile2Line,
  RiSpeedUpLine, RiBatteryChargeLine, RiMapPinLine, RiPhoneLine,
  RiExternalLinkLine, RiPlayCircleLine, RiPauseCircleLine,
  RiCarLine, RiFocus3Line, RiSearchLine, RiFilterLine, RiRoadMapLine
} from 'react-icons/ri';
import AppLayout from '../../components/AppLayout';
import { useTheme } from '../../context/ThemeContext';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import './TrackingPage.css';

// Official Google Maps & Free Tile Providers (Zero API Key, High Fidelity)
const TILE_LAYERS = {
  googleRoadmap: {
    id: 'googleRoadmap',
    name: 'Google Maps (Roadmap)',
    url: 'https://{s}.google.com/vt/lyrs=m&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps'
  },
  googleHybrid: {
    id: 'googleHybrid',
    name: 'Google Hybrid (Satellite + Roads)',
    url: 'https://{s}.google.com/vt/lyrs=y&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps'
  },
  googleSatellite: {
    id: 'googleSatellite',
    name: 'Google Satellite',
    url: 'https://{s}.google.com/vt/lyrs=s&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps'
  },
  googleTerrain: {
    id: 'googleTerrain',
    name: 'Google Terrain',
    url: 'https://{s}.google.com/vt/lyrs=p&x={x}&y={y}&z={z}',
    subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
    maxZoom: 20,
    attribution: '&copy; Google Maps'
  },
  osm: {
    id: 'osm',
    name: 'OpenStreetMap',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    subdomains: ['a', 'b', 'c'],
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors'
  }
};

export default function TrackingPage() {
  const { isDark } = useTheme();
  const [autos, setAutos] = useState([]);
  const [selectedAuto, setSelectedAuto] = useState(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [mapStyle, setMapStyle] = useState('googleRoadmap');
  const [loading, setLoading] = useState(true);
  const [autoSimulate, setAutoSimulate] = useState(false);

  // Leaflet Refs
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const tileLayerRef = useRef(null);
  const markersRef = useRef({});

  // Fetch Fleet Telematics
  const fetchTelemetry = useCallback(async () => {
    try {
      setLoading(true);
      const res = await api.get('/autos', { params: { limit: 100 } });
      if (res.data.success) {
        const fleet = res.data.autos || [];
        setAutos(fleet);
        if (fleet.length > 0) {
          setSelectedAuto(prev => {
            if (!prev) return fleet[0];
            const updated = fleet.find(a => a.id === prev.id);
            return updated || fleet[0];
          });
        }
      }
    } catch (err) {
      console.error('Failed to load fleet telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTelemetry();
  }, [fetchTelemetry]);

  // Initialize Leaflet Map (Guaranteed Clean Rendering)
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Create Leaflet instance centered on Chennai
      const map = L.map(mapContainerRef.current, {
        center: [13.0418, 80.2341],
        zoom: 12,
        zoomControl: true,
        attributionControl: false
      });

      // Add Tile Layer (Google Maps by default)
      const initialStyle = TILE_LAYERS[mapStyle] || TILE_LAYERS.googleRoadmap;
      const tiles = L.tileLayer(initialStyle.url, {
        maxZoom: initialStyle.maxZoom || 20,
        subdomains: initialStyle.subdomains || ['mt0', 'mt1', 'mt2', 'mt3']
      }).addTo(map);

      tileLayerRef.current = tiles;
      mapInstanceRef.current = map;

      // Force multiple size invalidations to prevent grey tiles / sizing bugs
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 150);
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 400);
      setTimeout(() => { if (mapInstanceRef.current) mapInstanceRef.current.invalidateSize(); }, 900);
    }

    // Attach ResizeObserver to auto-invalidate on layout changes
    let resizeObserver = null;
    if (typeof ResizeObserver !== 'undefined' && mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize();
        }
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markersRef.current = {};
      }
    };
  }, []); // Run once on mount

  // Switch Tile Layer when mapStyle changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;

    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
    }

    const currentStyle = TILE_LAYERS[mapStyle] || TILE_LAYERS.googleRoadmap;
    const newTiles = L.tileLayer(currentStyle.url, {
      maxZoom: currentStyle.maxZoom || 20,
      subdomains: currentStyle.subdomains || ['mt0', 'mt1', 'mt2', 'mt3']
    }).addTo(map);

    tileLayerRef.current = newTiles;
    map.invalidateSize();
  }, [mapStyle]);

  // Filtered Autos
  const filteredAutos = useMemo(() => {
    return autos.filter(a => {
      const matchesSearch =
        !search.trim() ||
        a.autoNumber?.toLowerCase().includes(search.toLowerCase()) ||
        a.assignedDriverName?.toLowerCase().includes(search.toLowerCase()) ||
        a.currentLocationName?.toLowerCase().includes(search.toLowerCase()) ||
        a.model?.toLowerCase().includes(search.toLowerCase());

      const matchesStatus =
        statusFilter === 'all' || a.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [autos, search, statusFilter]);

  // Render & Update Leaflet Markers
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const map = mapInstanceRef.current;
    const currentKeys = new Set();

    filteredAutos.forEach(auto => {
      currentKeys.add(auto.id);
      const lat = auto.currentLatitude || 13.0418;
      const lng = auto.currentLongitude || 80.2341;
      const isSelected = selectedAuto?.id === auto.id;

      const html = `
        <div class="leaflet-ev-pin ${auto.status || 'active'} ${isSelected ? 'is-selected' : ''}">
          <div class="pin-badge">
            <span class="pin-icon">${auto.status === 'charging' ? '⚡' : '🛺'}</span>
            <span class="pin-num">${auto.autoNumber}</span>
            <span class="pin-soc">${auto.batterySocPct != null ? `${auto.batterySocPct}%` : '80%'}</span>
          </div>
          <div class="pin-pointer"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        html,
        className: 'leaflet-custom-div-icon',
        iconSize: [120, 36],
        iconAnchor: [60, 36]
      });

      if (markersRef.current[auto.id]) {
        markersRef.current[auto.id].setLatLng([lat, lng]);
        markersRef.current[auto.id].setIcon(customIcon);
      } else {
        const marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);
        marker.on('click', () => {
          setSelectedAuto(auto);
          map.flyTo([lat, lng], 14, { duration: 0.8 });
        });
        markersRef.current[auto.id] = marker;
      }
    });

    // Clean up markers
    Object.keys(markersRef.current).forEach(id => {
      if (!currentKeys.has(id)) {
        map.removeLayer(markersRef.current[id]);
        delete markersRef.current[id];
      }
    });
  }, [filteredAutos, selectedAuto]);

  // Fit all fleet in view
  const handleFitFleet = () => {
    if (!mapInstanceRef.current) return;
    const markers = Object.values(markersRef.current);
    if (markers.length === 0) return;

    const group = L.featureGroup(markers);
    mapInstanceRef.current.fitBounds(group.getBounds().pad(0.2), { duration: 1 });
  };

  // Fly to selected auto
  const handleSelectAuto = (auto) => {
    setSelectedAuto(auto);
    if (mapInstanceRef.current) {
      const lat = auto.currentLatitude || 13.0418;
      const lng = auto.currentLongitude || 80.2341;
      mapInstanceRef.current.flyTo([lat, lng], 14, { duration: 1 });
    }
  };

  // Simulate Telemetry Tick
  const handleSimulateTick = async () => {
    try {
      const res = await api.post('/autos/simulate-telemetry');
      if (res.data.success) {
        toast.success('Live Chennai GPS telematics updated!');
        fetchTelemetry();
      }
    } catch {
      toast.error('Simulation failed');
    }
  };

  // Auto-Simulate Interval (8s)
  useEffect(() => {
    if (!autoSimulate) return;
    const interval = setInterval(async () => {
      try {
        await api.post('/autos/simulate-telemetry');
        fetchTelemetry();
      } catch {}
    }, 8000);
    return () => clearInterval(interval);
  }, [autoSimulate, fetchTelemetry]);

  return (
    <AppLayout title="Live Fleet Tracking">
      <div className="page-wrapper">
        {/* Page Header */}
        <div className="page-header">
          <div>
            <h1 className="page-title">
              <RiCompass3Line style={{ color: 'var(--accent)' }} />
              Live Fleet Tracking
            </h1>
            <p className="page-subtitle">Real-time OpenStreetMap/Leaflet GPS telematics across Chennai transit corridors</p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              className={`btn btn-outline ${autoSimulate ? 'btn-success' : ''}`}
              onClick={() => setAutoSimulate(prev => !prev)}
            >
              {autoSimulate ? <><RiPauseCircleLine /> Auto-Sim Active (8s)</> : <><RiPlayCircleLine /> Start Auto-Sim</>}
            </button>
            <button className="btn btn-primary" onClick={handleSimulateTick}>
              <RiRefreshLine /> Ping & Update Telemetry
            </button>
          </div>
        </div>

        {/* Classic Map Card */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', marginBottom: 20 }}>
          {/* Card Header with Common Search & Controls */}
          <div className="card-header" style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div className="search-bar" style={{ minWidth: 240, maxWidth: 360, flex: '1 1 auto' }}>
              <RiSearchLine className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search fleet by Auto No, Location, Driver..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
              <select
                className="form-control"
                style={{ width: 'auto' }}
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
              >
                <option value="all">All Vehicles ({autos.length})</option>
                <option value="active">Active On Road</option>
                <option value="charging">Charging</option>
                <option value="idle">Idle / Standby</option>
                <option value="maintenance">Maintenance</option>
              </select>

              <select
                className="form-control"
                style={{ width: 'auto' }}
                value={mapStyle}
                onChange={e => setMapStyle(e.target.value)}
              >
                <option value="googleRoadmap">🗺️ Google Maps (Roadmap)</option>
                <option value="googleHybrid">🛰️ Google Hybrid</option>
                <option value="googleSatellite">🌍 Google Satellite</option>
                <option value="googleTerrain">⛰️ Google Terrain</option>
                <option value="osm">🌐 OpenStreetMap</option>
              </select>

              <button className="btn btn-outline" onClick={handleFitFleet} title="Frame all vehicles on screen">
                <RiFocus3Line /> Fit All Fleet
              </button>
            </div>
          </div>

          {/* Map Canvas with Guaranteed Height */}
          <div className="leaflet-map-wrapper">
            <div className="tracking-map-pill">
              <div className="tracking-radar-dot" />
              <span>CHENNAI LIVE GPS ({filteredAutos.length} AUTOS ONLINE)</span>
            </div>
            <div ref={mapContainerRef} style={{ width: '100%', height: '100%' }} />
          </div>
        </div>

        {/* Bottom Fleet Overview & Telemetry Grid */}
        <div className="tracking-bottom-grid">
          {/* Selected Vehicle Telemetry Inspector Card */}
          <div className="card">
            {selectedAuto ? (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div>
                    <h3 style={{ margin: '0 0 4px 0', fontSize: '1.25rem', fontWeight: 800 }}>
                      🛺 <code>{selectedAuto.autoNumber}</code>
                    </h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {selectedAuto.make} {selectedAuto.model} • {selectedAuto.manufacturingYear || '2024'}
                    </div>
                  </div>
                  <span className={`badge ${selectedAuto.status === 'active' ? 'badge-success' : selectedAuto.status === 'charging' ? 'badge-info' : selectedAuto.status === 'maintenance' ? 'badge-danger' : 'badge-warning'}`}>
                    {selectedAuto.status === 'active' ? 'Active On Road' : selectedAuto.status === 'charging' ? 'Charging' : selectedAuto.status === 'maintenance' ? 'Maintenance' : 'Idle'}
                  </span>
                </div>

                {/* Telemetry Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                  <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Battery SOC %
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: (selectedAuto.batterySocPct || 80) <= 20 ? 'var(--danger)' : (selectedAuto.batterySocPct || 80) <= 45 ? 'var(--warning)' : 'var(--success)' }}>
                      ⚡ {selectedAuto.batterySocPct != null ? `${selectedAuto.batterySocPct}%` : '80%'}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Est. Range: ~{Math.round((selectedAuto.rangePerChargeKm || 120) * ((selectedAuto.batterySocPct || 80) / 100))} km
                    </div>
                  </div>

                  <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)' }}>
                    <div style={{ fontSize: '0.72rem', textTransform: 'uppercase', fontWeight: 700, color: 'var(--text-muted)', marginBottom: 4 }}>
                      Current Speed
                    </div>
                    <div style={{ fontSize: '1.3rem', fontWeight: 800, color: selectedAuto.currentSpeedKm > 0 ? 'var(--accent)' : 'var(--text-primary)' }}>
                      <RiSpeedUpLine /> {selectedAuto.currentSpeedKm || 0} km/h
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                      Today: {selectedAuto.dailyDistanceKm ? `${selectedAuto.dailyDistanceKm.toFixed(1)} km` : '0 km'}
                    </div>
                  </div>
                </div>

                {/* Location Details */}
                <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 14 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700, fontSize: '0.85rem', marginBottom: 4 }}>
                    <RiMapPinLine style={{ color: 'var(--accent)' }} />
                    {selectedAuto.currentLocationName || 'Chennai Hub'}
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>
                    GPS: {selectedAuto.currentLatitude || 13.0418}° N, {selectedAuto.currentLongitude || 80.2341}° E
                  </div>
                </div>

                {/* Driver Details */}
                <div style={{ background: 'var(--bg-secondary)', padding: '12px 14px', borderRadius: 10, border: '1px solid var(--border)', marginBottom: 16 }}>
                  <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', color: 'var(--text-muted)', fontWeight: 700, marginBottom: 4 }}>
                    Assigned Duty Driver
                  </div>
                  {selectedAuto.assignedDriverName ? (
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                          {selectedAuto.assignedDriverName}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                          {selectedAuto.assignedDriverPhone} • Lic: {selectedAuto.driverLicenseNumber || 'N/A'}
                        </div>
                      </div>
                      {selectedAuto.assignedDriverPhone && (
                        <a
                          href={`tel:${selectedAuto.assignedDriverPhone}`}
                          className="btn btn-icon btn-sm"
                          title="Call Driver"
                        >
                          <RiPhoneLine />
                        </a>
                      )}
                    </div>
                  ) : (
                    <div style={{ fontStyle: 'italic', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                      No driver assigned to this auto currently.
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    className="btn btn-outline"
                    style={{ flex: 1, justifyContent: 'center' }}
                    onClick={() => handleSelectAuto(selectedAuto)}
                  >
                    <RiFocus3Line /> Focus on Map
                  </button>
                  <a
                    href={`https://www.google.com/maps?q=${selectedAuto.currentLatitude || 13.0418},${selectedAuto.currentLongitude || 80.2341}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline"
                    style={{ flex: 1, textDecoration: 'none', justifyContent: 'center' }}
                  >
                    <RiExternalLinkLine /> Google Maps
                  </a>
                </div>
              </div>
            ) : (
              <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
                Select a vehicle to inspect live telematics
              </div>
            )}
          </div>

          {/* Quick Fleet Telemetry List Card */}
          <div className="card">
            <div className="card-header" style={{ paddingBottom: 12, marginBottom: 12 }}>
              <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800 }}>Fleet Telematics ({filteredAutos.length})</h4>
            </div>

            <div style={{ maxHeight: 380, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {filteredAutos.map(auto => {
                const isSelected = selectedAuto?.id === auto.id;
                return (
                  <div
                    key={auto.id}
                    onClick={() => handleSelectAuto(auto)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: isSelected ? '1px solid var(--accent)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--accent-glow)' : 'var(--bg-secondary)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      transition: 'var(--transition)'
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.85rem' }}>
                        🛺 <code>{auto.autoNumber}</code>
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>
                        📍 {auto.currentLocationName || 'Chennai Hub'}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.8rem', color: (auto.batterySocPct || 80) <= 20 ? 'var(--danger)' : (auto.batterySocPct || 80) <= 45 ? 'var(--warning)' : 'var(--success)' }}>
                        ⚡ {auto.batterySocPct != null ? `${auto.batterySocPct}%` : '80%'}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                        {auto.currentSpeedKm || 0} km/h
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
