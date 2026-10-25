import React, { useState, useMemo, useEffect, useCallback, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import MapLibreView from '../components/MapLibreView';
import FacilityCard from '../components/FacilityCard';
import ComprehensiveMatrixModal from '../components/ComprehensiveMatrixModal';
import ChangeLocationModal from '../components/ChangeLocationModal';
import AdminAddBranchModal from '../components/AdminAddBranchModal';
import {
  SearchIcon,
  PinIcon,
  RefreshIcon,
  ShieldAlertIcon,
  SplitViewIcon,
  MapIcon,
  ListIcon,
} from '../components/Icons';
import '../styles/BloodLocator.css';

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const COMPONENTS = ['Packed RBC', 'Whole Blood', 'Platelets', 'Plasma', 'Cryoprecipitate'];

async function readLocatorResponse(response) {
  const body = await response.text();
  if (!body.trim()) {
    throw new Error(
      `The locator API returned an empty response (HTTP ${response.status}). Start the backend on port 3000 and check its MongoDB connection.`
    );
  }

  try {
    return JSON.parse(body);
  } catch {
    const title = body.match(/<title>(.*?)<\/title>/i)?.[1];
    const detail = title || body.replace(/\s+/g, ' ').slice(0, 140);
    throw new Error(
      `The locator API returned a non-JSON response (HTTP ${response.status})${detail ? `: ${detail}` : '.'}`
    );
  }
}

// Haversine formula to dynamically calculate real-time distance
function computeHaversineKm(lat1, lon1, lat2, lon2) {
  if (![lat1, lon1, lat2, lon2].every(Number.isFinite)) return Number.POSITIVE_INFINITY;
  const R = 6371; // km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

export default function BloodBankMap() {
  const placesLibrary = useMapsLibrary('places');
  const requestedGooglePlaceIdsRef = useRef(new Set());
  // Facility and stock details are loaded from the locator API backed by MongoDB.
  const [facilitiesList, setFacilitiesList] = useState([]);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodType, setSelectedBloodType] = useState('B-');
  const [selectedComponent, setSelectedComponent] = useState('Packed RBC');
  const [selectedRadiusKm, setSelectedRadiusKm] = useState(30);
  const [hierarchyMode, setHierarchyMode] = useState('prc-first'); // 'prc-first', 'prc-only', 'bsf-only'
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [viewMode, setViewMode] = useState('split'); // 'split', 'map-only', 'list-only'
  const [currentOrigin, setCurrentOrigin] = useState({ name: 'Manila', lat: 14.5888, lon: 120.9744 });

  // Selected facility for map interaction / details modal
  const [selectedFacility, setSelectedFacility] = useState(null);

  // Modals state
  const [matrixModalFacility, setMatrixModalFacility] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const bloodTypes = BLOOD_TYPES;
  const components = COMPONENTS.map((label) => ({ id: label, label }));
  // Sync toast state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [loadWarning, setLoadWarning] = useState('');

  // Fetch facilities from MongoDB / git store on mount
  const fetchRemoteFacilities = useCallback(async () => {
    try {
      const res = await fetch('/api/locator/facilities');
      const data = await readLocatorResponse(res);
      if (!res.ok || !data.success || !Array.isArray(data.facilities)) {
        throw new Error(data.message || 'Failed to load locator data.');
      }
      const locatedFacilities = data.facilities
        .filter((facility) => facility.lat != null && facility.lon != null &&
          Number.isFinite(Number(facility.lat)) && Number.isFinite(Number(facility.lon)))
        .map((facility) => ({
          ...facility,
          lat: Number(facility.lat),
          lon: Number(facility.lon),
          phone: facility.phone || '',
          hours: facility.hours || '',
          googlePlaceId: facility.googlePlaceId || ''
        }));
      setFacilitiesList(locatedFacilities);
      setLoadError('');
      setLoadWarning(data.unlocatedCount
        ? `${data.unlocatedCount} saved ${data.unlocatedCount === 1 ? 'facility has' : 'facilities have'} no coordinates and cannot be shown on the map yet.`
        : '');
      return locatedFacilities;
    } catch (err) {
      console.error('Load locator facilities:', err);
      setLoadError(err.message || 'Unable to load blood locator data.');
      setLoadWarning('');
      return null;
    }
  }, []);

  useEffect(() => {
    fetchRemoteFacilities();
  }, [fetchRemoteFacilities]);

  const googlePlaceIdsKey = facilitiesList
    .map((facility) => facility.googlePlaceId)
    .filter(Boolean)
    .sort()
    .join('|');

  // Fetch Google contact details on demand for display only. They stay in browser state,
  // while MongoDB contains only the exempt Place ID.
  useEffect(() => {
    if (!placesLibrary) return undefined;
    let cancelled = false;
    const placeIds = facilitiesList
      .map((facility) => facility.googlePlaceId)
      .filter((placeId) => placeId && !requestedGooglePlaceIdsRef.current.has(placeId));

    placeIds.forEach((placeId) => requestedGooglePlaceIdsRef.current.add(placeId));
    Promise.all(placeIds.map(async (placeId) => {
      try {
        const place = new placesLibrary.Place({ id: placeId });
        await place.fetchFields({ fields: ['nationalPhoneNumber', 'internationalPhoneNumber', 'regularOpeningHours'] });
        if (cancelled) return;
        const phone = place.nationalPhoneNumber || place.internationalPhoneNumber || '';
        const hours = place.regularOpeningHours?.weekdayDescriptions?.join(' · ') || '';
        setFacilitiesList((current) => current.map((facility) => facility.googlePlaceId === placeId
          ? { ...facility, phone, hours }
          : facility));
        setSelectedFacility((current) => current?.googlePlaceId === placeId
          ? { ...current, phone, hours }
          : current);
      } catch (error) {
        requestedGooglePlaceIdsRef.current.delete(placeId);
        console.warn(`Google Places details unavailable for ${placeId}:`, error);
      }
    }));

    return () => {
      cancelled = true;
      // Permit the strict-mode remount and future retry if a request was interrupted.
      placeIds.forEach((placeId) => requestedGooglePlaceIdsRef.current.delete(placeId));
    };
  }, [googlePlaceIdsKey, placesLibrary]);

  // Component key helper
  const getComponentKey = (compLabel) => {
    if (compLabel.toLowerCase().includes('whole')) return 'whole';
    if (compLabel.toLowerCase().includes('platelet')) return 'platelet';
    if (compLabel.toLowerCase().includes('plasma')) return 'plasma';
    if (compLabel.toLowerCase().includes('cryo')) return 'cryo';
    return 'prbc';
  };

  const compKey = getComponentKey(selectedComponent);
  const targetBT = selectedBloodType === 'ALL' ? 'O+' : selectedBloodType;

  // Compute facilities with dynamic distance relative to currentOrigin
  const facilitiesWithDistance = useMemo(() => {
    return facilitiesList.map((fac) => {
      const dist = computeHaversineKm(
        currentOrigin.lat,
        currentOrigin.lon,
        fac.lat,
        fac.lon
      );
      const approxMins = Math.max(5, Math.round(dist * 2.8));
      return {
        ...fac,
        distanceKm: dist,
        travelTime: `~${approxMins} mins`
      };
    });
  }, [facilitiesList, currentOrigin]);

  // Filter facilities
  const filteredFacilities = useMemo(() => {
    return facilitiesWithDistance.filter((fac) => {
      // Radius filter
      if (fac.distanceKm > selectedRadiusKm) return false;

      // Hierarchy filter
      if (hierarchyMode === 'prc-only' && fac.category !== 'PRC') return false;
      if (hierarchyMode === 'bsf-only' && fac.category !== 'Hospital BSF') return false;

      // Search keyword filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (fac.name || fac.facilityName || '').toLowerCase().includes(q);
        const matchesAddress = (fac.address || '').toLowerCase().includes(q);
        const matchesCategory = (fac.typeLabel || '').toLowerCase().includes(q);
        if (!matchesName && !matchesAddress && !matchesCategory) return false;
      }

      // Hide unavailable filter
      if (hideUnavailable) {
        const status = fac.matrix?.[targetBT]?.[compKey];
        if (status === 'Unavailable' || status === 'Out of Stock') return false;
      }

      return true;
    });
  }, [facilitiesWithDistance, selectedRadiusKm, hierarchyMode, searchQuery, hideUnavailable, targetBT, compKey]);

  // Split into Priority 1 (PRC) and Priority 2 (Hospital BSFs)
  const prcFacilities = useMemo(() => {
    return filteredFacilities
      .filter((f) => f.category === 'PRC')
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [filteredFacilities]);

  const bsfFacilities = useMemo(() => {
    return filteredFacilities
      .filter((f) => f.category === 'Hospital BSF')
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }, [filteredFacilities]);

  // Count available BSFs for metric card
  const availableCount = useMemo(() => {
    return facilitiesWithDistance.filter((f) => {
      const status = f.matrix?.[targetBT]?.[compKey];
      return status === 'Available' || status === 'Low';
    }).length;
  }, [facilitiesWithDistance, targetBT, compKey]);

  // Refresh locator state from MongoDB.
  const handleTriggerSync = async () => {
    setIsSyncing(true);
    const freshFacilities = await fetchRemoteFacilities();
    setIsSyncing(false);
    if (freshFacilities !== null) {
      setSyncToast(`Locator refreshed from MongoDB: ${freshFacilities.length} facilities.`);
      setTimeout(() => setSyncToast(null), 4000);
    }
  };

  // Callback when admin adds a new branch from map
  const handleBranchAdded = async (newBranch) => {
    const updatedFacilities = await fetchRemoteFacilities();
    setSelectedFacility(updatedFacilities?.find((facility) => facility.id === newBranch?.id) || null);
    setSyncToast('Facility saved to MongoDB and locator refreshed.');
    setTimeout(() => setSyncToast(null), 4500);
  };

  return (
    <div className="blood-locator-page">
      {/* Hero Banner */}
      <section className="locator-hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">
            <span>SANDUGO</span>
            <span className="dot-separator">•</span>
            <span>BLOOD LOCATOR</span>
            <span className="dot-separator">•</span>
            <span className="live-badge">
              <span className="pulse-dot"></span> LIVE BSF NETWORK
            </span>
          </div>

          <h1 className="hero-title">
            Sandugo Blood Locator
          </h1>

          <p className="hero-description">
            Locate verified blood stocks across nearest Philippine Red Cross chapters and hospital Blood Service Facilities.
            Reflects simplified, privacy-preserving availability statuses (Available, Low, Unavailable) with locational routing and proximity mapping.
          </p>

          {/* Admin Add Branch Trigger directly on Locator page */}
          <div>
            <button
              type="button"
              className="btn-admin-add-branch-hero"
              onClick={() => setShowAdminModal(true)}
              title="Open Admin Portal to add new facility via map click"
            >
              <PinIcon size={14} />
              <span>+ Admin: Add Branch</span>
            </button>
          </div>

          {/* 4 Hero Metric Cards */}
          <div className="hero-metrics-grid" style={{ marginTop: '1.25rem' }}>
            <div className="metric-card">
              <span className="metric-label">PRC Chapters Monitored</span>
              <div className="metric-value-row">
                <span className="metric-value prc-red">
                  {facilitiesList.filter((f) => f.category === 'PRC').length} Chapters
                </span>
              </div>
            </div>

            <div className="metric-card">
              <span className="metric-label">Participating Hospital BSFs</span>
              <div className="metric-value-row">
                <span className="metric-value bsf-blue">
                  {facilitiesList.filter((f) => f.category === 'Hospital BSF').length} Facilities
                </span>
              </div>
            </div>

            <div className="metric-card">
              <span className="metric-label">Available for {targetBT}</span>
              <div className="metric-value-row">
                <span className={`metric-value ${availableCount > 0 ? 'avail-green' : 'avail-red'}`}>
                  {availableCount} of {facilitiesList.length} BSFs
                </span>
              </div>
            </div>

            <div className="metric-card">
              <span className="metric-label">MongoDB Locator Data</span>
              <div className="metric-value-row">
                <span className="metric-value sync-white">Facility + stock records</span>
                <button
                  type="button"
                  className="btn-sync-spin"
                  title="Synchronize BBIS Data"
                  onClick={handleTriggerSync}
                >
                  <RefreshIcon size={14} spinning={isSyncing} />
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="locator-main-container">
        {loadError && (
          <div role="alert" className="locator-load-error">
            {loadError}
          </div>
        )}
        {loadWarning && <div className="locator-load-warning">{loadWarning}</div>}
        {/* Filter Controls Bar */}
        <div className="filter-section-wrapper">
          {/* Top Row: Search, Location, Change Location, Radius */}
          <div className="search-origin-row">
            <div className="search-input-wrapper">
              <SearchIcon size={16} className="search-icon" />
              <input
                type="text"
                className="search-input"
                placeholder="Search PRC chapter, hospital, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="location-display-box">
              <span style={{ color: '#dc2626', display: 'flex', alignItems: 'center' }}>
                <PinIcon size={16} />
              </span>
              <span>{currentOrigin.name}</span>
            </div>

            <button
              type="button"
              className="btn-change-location"
              onClick={() => setShowLocationModal(true)}
            >
              <PinIcon size={14} />
              <span>Change Location</span>
            </button>

            <div className="radius-select-box">
              <span className="radius-label">Radius:</span>
              <select
                className="radius-select"
                value={selectedRadiusKm}
                onChange={(e) => setSelectedRadiusKm(parseInt(e.target.value))}
              >
                <option value={5}>Within 5 km</option>
                <option value={10}>Within 10 km</option>
                <option value={15}>Within 15 km</option>
                <option value={30}>Within 30 km</option>
                <option value={50}>Within 50 km</option>
              </select>
            </div>
          </div>

          {/* Middle Row: Blood Type buttons & Component Select */}
          <div className="bt-component-row">
            <div className="bt-group">
              <span className="bt-group-label">Blood Type:</span>
              {bloodTypes.map((bt) => (
                <button
                  key={bt}
                  type="button"
                  className={`bt-pill-btn ${selectedBloodType === bt ? 'active' : ''}`}
                  onClick={() => setSelectedBloodType(bt)}
                >
                  {bt}
                </button>
              ))}
            </div>

            <div className="component-group">
              <span className="component-label">Component:</span>
              <select
                className="component-select"
                value={selectedComponent}
                onChange={(e) => setSelectedComponent(e.target.value)}
              >
                {components.map((c) => (
                  <option key={c.id} value={c.label}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Bottom Row: Hierarchy Search & Checkbox */}
          <div className="hierarchy-filter-row">
            <div className="hierarchy-group">
              <span className="hierarchy-label">
                Hierarchy Search:
              </span>
              <button
                type="button"
                className={`hierarchy-btn ${hierarchyMode === 'prc-first' ? 'active' : ''}`}
                onClick={() => setHierarchyMode('prc-first')}
              >
                1. PRC First, then Participating BSFs (Recommended)
              </button>
              <button
                type="button"
                className={`hierarchy-btn ${hierarchyMode === 'prc-only' ? 'active' : ''}`}
                onClick={() => setHierarchyMode('prc-only')}
              >
                PRC Chapters Only
              </button>
              <button
                type="button"
                className={`hierarchy-btn ${hierarchyMode === 'bsf-only' ? 'active' : ''}`}
                onClick={() => setHierarchyMode('bsf-only')}
              >
                Hospital BSFs Only
              </button>
            </div>

            <label className="checkbox-available-only">
              <input
                type="checkbox"
                checked={hideUnavailable}
                onChange={(e) => setHideUnavailable(e.target.checked)}
              />
              <span>Show 'Available' or 'Low' only (Hide Unavailable)</span>
            </label>
          </div>
        </div>

        {/* Results Header Bar & View Switcher */}
        <div className="results-header-bar">
          <p className="results-count-text">
            <strong>{filteredFacilities.length} facilities</strong> found near{' '}
            <span
              className="results-origin-link"
              onClick={() => setShowLocationModal(true)}
            >
              {currentOrigin.name}
            </span>
          </p>

          <div className="view-switcher-group">
            <button
              type="button"
              className={`view-btn ${viewMode === 'split' ? 'active' : ''}`}
              onClick={() => setViewMode('split')}
            >
              <SplitViewIcon size={14} />
              <span>Split View</span>
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === 'map-only' ? 'active' : ''}`}
              onClick={() => setViewMode('map-only')}
            >
              <MapIcon size={14} />
              <span>Map Only</span>
            </button>
            <button
              type="button"
              className={`view-btn ${viewMode === 'list-only' ? 'active' : ''}`}
              onClick={() => setViewMode('list-only')}
            >
              <ListIcon size={14} />
              <span>List Only</span>
            </button>
          </div>
        </div>

        {/* Content Area: Split View, Map Only, or List Only */}
        <div className={`split-view-layout ${viewMode}`}>
          {/* Map Column (Left side in Split View) */}
          {(viewMode === 'split' || viewMode === 'map-only') && (
            <div className="map-column">
              <MapLibreView
                facilities={filteredFacilities}
                selectedFacility={selectedFacility}
                onSelectFacility={setSelectedFacility}
                onOpenMatrix={(fac) => setMatrixModalFacility(fac)}
                selectedBloodType={selectedBloodType}
                selectedComponent={selectedComponent}
                currentOrigin={currentOrigin}
              />
            </div>
          )}

          {/* Cards Column (Right side in Split View) */}
          {(viewMode === 'split' || viewMode === 'list-only') && (
            <div className="cards-column">
              {/* Priority 1 Group: PRC Chapters */}
              {prcFacilities.length > 0 && (
                <>
                  <div className="priority-section-header">
                    <h4 className="priority-title">
                      <span className="priority-dot prc"></span>
                      <span>PRIORITY 1: PHILIPPINE RED CROSS (PRC) CHAPTERS</span>
                      <span className="priority-count">({prcFacilities.length} branches)</span>
                    </h4>
                    <span className="priority-sub">Sorted by nearest distance</span>
                  </div>

                  {prcFacilities.map((fac) => (
                    <FacilityCard
                      key={fac.facilityID || fac.id}
                      facility={fac}
                      selectedBloodType={selectedBloodType}
                      selectedComponent={selectedComponent}
                      isSelected={selectedFacility?.id === fac.id || selectedFacility?.facilityID === fac.facilityID}
                      onSelect={(f) => setSelectedFacility(f)}
                      onOpenDetails={(f) => setMatrixModalFacility(f)}
                    />
                  ))}
                </>
              )}

              {/* Priority 2 Group: Participating Hospital BSFs */}
              {bsfFacilities.length > 0 && (
                <>
                  <div className="priority-section-header" style={{ marginTop: '1.5rem' }}>
                    <h4 className="priority-title">
                      <span className="priority-dot bsf"></span>
                      <span>PRIORITY 2: PARTICIPATING HOSPITAL BLOOD SERVICE FACILITIES (BSFs)</span>
                      <span className="priority-count">({bsfFacilities.length} facilities)</span>
                    </h4>
                    <span className="priority-sub">Sorted by nearest distance</span>
                  </div>

                  {bsfFacilities.map((fac) => (
                    <FacilityCard
                      key={fac.facilityID || fac.id}
                      facility={fac}
                      selectedBloodType={selectedBloodType}
                      selectedComponent={selectedComponent}
                      isSelected={selectedFacility?.id === fac.id || selectedFacility?.facilityID === fac.facilityID}
                      onSelect={(f) => setSelectedFacility(f)}
                      onOpenDetails={(f) => setMatrixModalFacility(f)}
                    />
                  ))}
                </>
              )}

              {filteredFacilities.length === 0 && (
                <div style={{ textAlign: 'center', padding: '3rem 1rem', background: '#fff', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                  <div style={{ color: '#94a3b8', display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                    <ShieldAlertIcon size={40} />
                  </div>
                  <h4 style={{ margin: '0.5rem 0 0.25rem', color: '#0f172a' }}>No Blood Service Facilities Found</h4>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                    Try expanding your search radius or click "+ Admin: Add Branch" to log a new branch into MongoDB.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Comprehensive Availability Matrix Modal */}
      {matrixModalFacility && (
        <ComprehensiveMatrixModal
          facility={matrixModalFacility}
          onClose={() => setMatrixModalFacility(null)}
        />
      )}

      {/* Change Location Modal */}
      {showLocationModal && (
        <ChangeLocationModal
          currentOrigin={currentOrigin}
          facilities={facilitiesList}
          onSelectCity={(city) => setCurrentOrigin(city)}
          onClose={() => setShowLocationModal(false)}
        />
      )}

      {/* Admin Add Branch Modal */}
      {showAdminModal && (
        <AdminAddBranchModal
          onClose={() => setShowAdminModal(false)}
          onBranchAdded={handleBranchAdded}
        />
      )}

      {/* BBIS Live Sync Notification Toast */}
      {syncToast && (
        <div className="bbis-toast">
          <RefreshIcon size={16} />
          <span>{syncToast}</span>
        </div>
      )}
    </div>
  );
}
