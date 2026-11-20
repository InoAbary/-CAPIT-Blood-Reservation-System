import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import MapLibreView from '../components/MapLibreView';
import FacilityCard from '../components/FacilityCard';
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
import { useMatch, useNavigate } from 'react-router-dom';
import DonorSidebar from '../components/DonorSidebar';
import '../styles/Dashboard.css';
import '../styles/UI.css';

import '../styles/BloodLocator.css';
import { useAuth } from '../context/AuthContext';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const AVAILABILITY_CACHE_TTL_MS = 60_000;

const BLOOD_TYPE_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

// Must match the BloodUnits.component enum exactly:
// ["Packed RBC", "Plasma", "Platelets", "Whole Blood"]
const COMPONENT_OPTIONS = [
  { id: 'prbc', label: 'Packed RBC' },
  { id: 'whole', label: 'Whole Blood' },
  { id: 'platelet', label: 'Platelets' },
  { id: 'plasma', label: 'Plasma' },
];

const isSameFacility = (first, second) => Boolean(
  first && second && (
    first.id === second.id ||
    (first.facilityID && second.facilityID && first.facilityID === second.facilityID)
  )
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function computeHaversineKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0;
  const R = 6371;
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

function getComponentKey(compLabel) {
  if (compLabel === 'Whole Blood') return 'whole';
  if (compLabel === 'Platelets') return 'platelet';
  if (compLabel === 'Plasma') return 'plasma';
  return 'prbc'; // Packed RBC
}

function statusForCount(units) {
  if (!units || units <= 0) return 'Unavailable';
  if (units <= 3) return 'Low';
  return 'Available';
}

function statusForInventory(value) {
  if (typeof value === 'string') {
    if (value === 'Available') return 'Available';
    if (value === 'Limited' || value === 'Critical') return 'Low';
    return 'Unavailable';
  }
  return statusForCount(value);
}

// availability[facilityID][bloodType][componentLabel] = unitCount
//   -> { [bloodType]: { [componentKey]: status } }
function buildMatrix(facilityAvailability) {
  const matrix = {};
  if (!facilityAvailability) return matrix;
  for (const [bt, comps] of Object.entries(facilityAvailability)) {
    matrix[bt] = matrix[bt] || {};
    for (const [compLabel, units] of Object.entries(comps)) {
      matrix[bt][getComponentKey(compLabel)] = statusForInventory(units);
    }
  }
  return matrix;
}

function formatFacility(f) {
  const mongoId = f._id?.$oid || f._id || null
  return {
    id: f.facilityID || f._id?.$oid || 'fac-' + Math.random(),
    mongoId,
    facilityID: f.facilityID,
    name: f.facilityName || f.name,
    facilityName: f.facilityName || f.name,
    category:
      f.category ||
      (f.facilityName?.includes('Red Cross') ? 'PRC' : 'Hospital BSF'),
    typeLabel:
      (f.typeLabel ||
        (f.category === 'PRC'
          ? 'Philippine Red Cross'
          : 'Blood Service Facility')).replace(/^Hospital\s+/i, ''),
    priority: f.category === 'PRC' ? 1 : 2,
    address: f.address,
    phone: f.contactNumber || f.contactNuber || f.phone || '(02) 8527-2195',
    hours: f.hours || '8:00 AM - 5:00 PM',
    lat: Number(f.lat) || 14.5995,
    lon: Number(f.lon) || 120.9842,
    quote: f.quote || 'Integrated blood facility connected to central repository.',
    bbisSyncedMins: f.bbisSyncedMins || 15,
    isActive: f.isActive !== false,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function BloodBankMap() {
  const [facilitiesList, setFacilitiesList] = useState([]);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodTypes, setSelectedBloodTypes] = useState(['B-']);
  const [selectedComponent, setSelectedComponent] = useState('Packed RBC');
  const [selectedRadiusKm, setSelectedRadiusKm] = useState(null);
  const [hierarchyMode, setHierarchyMode] = useState('prc-first');
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [viewMode, setViewMode] = useState('split');

  const [currentOrigin, setCurrentOrigin] = useState({
    name: 'City of Manila',
    lat: 14.5888,
    lon: 120.9744,
  });

  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState(null);
  const [selectedFacility, setSelectedFacility] = useState(null);
  const [pinnedFacility, setPinnedFacility] = useState(null);
  const cardsColumnRef = useRef(null);
  const previousPageScrollRef = useRef(null);

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  const [bloodTypes] = useState(BLOOD_TYPE_OPTIONS);
  const [components] = useState(COMPONENT_OPTIONS);

  const [syncToast, setSyncToast] = useState(null);

  const handleSelectFacility = (facility, source = 'card') => {
    if (isSameFacility(selectedFacility, facility)) {
      setSelectedFacility(null);
      setPinnedFacility(null);
      if (source === 'map' && previousPageScrollRef.current !== null) {
        const pageScroll = previousPageScrollRef.current;
        window.requestAnimationFrame(() => window.scrollTo({ top: pageScroll, behavior: 'auto' }));
      }
      previousPageScrollRef.current = null;
      return;
    }

    setSelectedFacility(facility);
    if (source === 'map') {
      previousPageScrollRef.current = window.scrollY;
      setPinnedFacility(facility);
    } else {
      setPinnedFacility(null);
    }

    if (facility && source === 'map' && viewMode === 'map-only') setViewMode('split');
  };

  const { donor, staff, logoutDonor } = useAuth();
  const navigate = useNavigate();
  const isMapPage = useMatch('/BloodBankMap');
  const showRecipientSidebar = Boolean(
    isMapPage && donor && localStorage.getItem('donorHubRole') === 'recipient'
  );

  const isAdmin = !donor && staff?.role === 'admin';

  // -------------------------------------------------------------------------
  // Availability cache (single slot, TTL, in-flight dedupe)
  // -------------------------------------------------------------------------
  const availabilityCacheRef = useRef({ data: null, fetchedAt: 0 });
  const availabilityInflightRef = useRef(null);

  const fetchAvailability = useCallback(async (facilityIDs) => {
    if (!facilityIDs || facilityIDs.length === 0) return {};

    const now = Date.now();
    const cached = availabilityCacheRef.current;
    if (cached.data && now - cached.fetchedAt < AVAILABILITY_CACHE_TTL_MS) {
      return cached.data;
    }
    if (availabilityInflightRef.current) return availabilityInflightRef.current;

    const promise = (async () => {
      try {
        const res = await fetch('/api/facilities/availability/batch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ facilityIDs }),
        });
        const data = await res.json();
        console.log(data)
        const availability = data.success ? data.availability || {} : {};
        availabilityCacheRef.current = {
          data: availability,
          fetchedAt: Date.now(),
        };
        return availability;
      } catch (err) {
        console.warn('Availability batch fetch failed:', err);
        availabilityCacheRef.current = { data: {}, fetchedAt: Date.now() };
        return {};
      } finally {
        availabilityInflightRef.current = null;
      }
    })();

    availabilityInflightRef.current = promise;
    return promise;
  }, []);

  const loadFacilities = useCallback(async () => {
    const res = await fetch('/api/facilities', {
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (!data.success || !Array.isArray(data.facilities)) return null;

    // Inventory.facilityID references the Facility Mongo ObjectId.
    const facilityIDs = data.facilities
      .map((f) => f._id?.$oid || f._id)
      .filter(Boolean);

    const availability = await fetchAvailability(facilityIDs);

    return data.facilities.map((f) => {
      const mongoId = f._id?.$oid || f._id;
      return {
        ...formatFacility(f),
        matrix: buildMatrix(availability[mongoId]),
      };
    });
  }, [fetchAvailability]);

  // Mount: facilities + availability
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const formatted = await loadFacilities();
        if (cancelled || !formatted) return;
        setFacilitiesList(formatted);
      } catch (err) {
        console.warn('API facilities fetch failed:', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loadFacilities]);

  // -------------------------------------------------------------------------
  // Derived values
  // -------------------------------------------------------------------------
  const compKey = getComponentKey(selectedComponent);
  const targetBTLabel = selectedBloodTypes.length <= 2
    ? selectedBloodTypes.join(', ')
    : `${selectedBloodTypes.length} blood types`;

  const statusesFor = (facility, componentKey) =>
    selectedBloodTypes.map((bloodType) => facility.matrix?.[bloodType]?.[componentKey] || 'Unavailable');

  const hasStockForSelection = (facility, componentKey) =>
    statusesFor(facility, componentKey).some((status) => status === 'Available' || status === 'Low');

  const facilitiesWithDistance = useMemo(() => {
    return facilitiesList.map((fac) => {
      const dist = computeHaversineKm(
        currentOrigin.lat,
        currentOrigin.lon,
        fac.lat,
        fac.lon
      );
      const approxMins = Math.max(5, Math.round(dist * 2.8));
      return { ...fac, distanceKm: dist, travelTime: `~${approxMins} mins` };
    });
  }, [facilitiesList, currentOrigin]);

  const filteredFacilities = useMemo(() => {
    return facilitiesWithDistance.filter((fac) => {
      if (selectedRadiusKm !== null && fac.distanceKm > selectedRadiusKm) return false;

      if (hierarchyMode === 'prc-only' && fac.category !== 'PRC') return false;
      if (hierarchyMode === 'bsf-only' && fac.category !== 'Hospital BSF')
        return false;

      if (searchQuery && searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesName = (fac.name || fac.facilityName || '')
          .toLowerCase()
          .includes(q);
        const matchesAddress = (fac.address || '').toLowerCase().includes(q);
        const matchesCategory = (fac.typeLabel || '')
          .toLowerCase()
          .includes(q);
        if (!matchesName && !matchesAddress && !matchesCategory) return false;
      }

      if (hideUnavailable) {
        if (!hasStockForSelection(fac, compKey)) return false;
      }

      return true;
    });
  }, [
    facilitiesWithDistance,
    selectedRadiusKm,
    hierarchyMode,
    searchQuery,
    hideUnavailable,
    selectedBloodTypes,
    compKey,
  ]);

  const prcFacilities = useMemo(
    () =>
      filteredFacilities
        .filter((f) => f.category === 'PRC')
        .sort((a, b) => a.distanceKm - b.distanceKm),
    [filteredFacilities]
  );

  const bsfFacilities = useMemo(
    () =>
      filteredFacilities
        .filter((f) => f.category === 'Hospital BSF')
        .sort((a, b) => a.distanceKm - b.distanceKm),
    [filteredFacilities]
  );

  const selectedFacilityInResults = filteredFacilities.find((facility) =>
    isSameFacility(facility, pinnedFacility)
  );
  const remainingPrcFacilities = prcFacilities.filter((facility) =>
    !isSameFacility(facility, selectedFacilityInResults)
  );
  const remainingBsfFacilities = bsfFacilities.filter((facility) =>
    !isSameFacility(facility, selectedFacilityInResults)
  );

  useEffect(() => {
    if (!selectedFacilityInResults || viewMode === 'map-only') return undefined;
    const frame = window.requestAnimationFrame(() => {
      const card = document.getElementById(`facility-card-${selectedFacilityInResults.id}`);
      if (card && cardsColumnRef.current) {
        const panel = cardsColumnRef.current;
        const cardTop = card.offsetTop - panel.offsetTop;
        const cardBottom = cardTop + card.offsetHeight;
        if (cardTop < panel.scrollTop || cardBottom > panel.scrollTop + panel.clientHeight) {
          panel.scrollTo({ top: cardTop - 16, behavior: 'auto' });
        }
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [selectedFacilityInResults?.id, viewMode]);

  const totalPrcFacilities = facilitiesList.filter((facility) => facility.category === 'PRC').length;
  const totalBsfFacilities = facilitiesList.filter((facility) => facility.category === 'Hospital BSF').length;

  const availableCount = useMemo(() => {
    return facilitiesWithDistance.filter((f) => {
      return hasStockForSelection(f, compKey);
    }).length;
  }, [facilitiesWithDistance, selectedBloodTypes, compKey]);

  const toggleBloodType = (bloodType) => {
    setSelectedBloodTypes((current) => {
      if (current.includes(bloodType)) {
        return current.length > 1 ? current.filter((type) => type !== bloodType) : current;
      }
      return [...current, bloodType];
    });
  };

  // -------------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------------
  const handleUseMyLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      setTimeout(() => setLocationError(null), 4000);
      return;
    }
    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos?.coords?.latitude;
        const lon = pos?.coords?.longitude;

        if (
          typeof lat !== 'number' ||
          typeof lon !== 'number' ||
          Number.isNaN(lat) ||
          Number.isNaN(lon)
        ) {
          setLocationError('Could not read coordinates from your device.');
          setIsLocating(false);
          setTimeout(() => setLocationError(null), 4000);
          return;
        }

        let name = `My Location (${lat.toFixed(4)}, ${lon.toFixed(4)})`;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`,
            { headers: { 'Accept-Language': 'en' } }
          );
          if (res.ok) {
            const data = await res.json();
            const addr = data.address || {};
            name =
              addr.city ||
              addr.town ||
              addr.village ||
              addr.suburb ||
              addr.county ||
              data.display_name?.split(',')[0] ||
              name;
          }
        } catch (err) {
          console.warn('Reverse geocode failed:', err);
        }

        setCurrentOrigin({ name, lat, lon });
        setIsLocating(false);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        setLocationError(
          err.code === err.PERMISSION_DENIED
            ? 'Location permission denied. Please enable it in your browser settings.'
            : 'Unable to retrieve your location. Try again.'
        );
        setIsLocating(false);
        setTimeout(() => setLocationError(null), 4000);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  };

  const handleBranchAdded = (newBranch) => {
    const base = formatFacility(newBranch);

    const formatted = {
      ...base,
      matrix: newBranch.matrix || {},
      distanceKm: computeHaversineKm(
        currentOrigin.lat,
        currentOrigin.lon,
        base.lat,
        base.lon
      ),
      travelTime: '~15 mins',
    };

    // New branch has no inventory yet; a re-sync will pull its units in.
    setFacilitiesList((prev) => [formatted, ...prev]);
    setSelectedFacility(formatted);
    setSyncToast(
      `Branch "${formatted.name}" added to MongoDB & active on locator.`
    );
    setTimeout(() => setSyncToast(null), 4500);
  };

  const locator = (
    <div className="blood-locator-page">
      {/* Hero Banner */}
      <section className="locator-hero">
        <div className="hero-inner">
          <div className="hero-eyebrow">
            <span>SANDUGO</span>
            <span className="dot-separator">•</span>
            <span>BLOOD LOCATOR</span>
          </div>

          <h1 className="hero-title">Sandugo Blood Locator</h1>

          <p className="hero-description">
            Locate verified blood stocks across nearest Philippine Red Cross
            chapters and Blood Service Facilities. Reflects simplified,
            privacy-preserving availability statuses (Available, Low,
            Unavailable) with locational routing and proximity mapping.
          </p>

          {isAdmin && (
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
          )}

          <div className="hero-metrics-grid">
            <div className="metric-card">
              <span className="metric-label">PRC Chapters Shown</span>
              <div className="metric-value-row">
                <span className="metric-value prc-red">
                  {prcFacilities.length} of {totalPrcFacilities} Chapters
                </span>
              </div>
            </div>

            <div className="metric-card">
              <span className="metric-label">BSFs Shown</span>
              <div className="metric-value-row">
                <span className="metric-value bsf-blue">
                  {bsfFacilities.length} of {totalBsfFacilities} Facilities
                </span>
              </div>
            </div>

            <div className="metric-card">
              <span className="metric-label">Available for {targetBTLabel}</span>
              <div className="metric-value-row">
                <span
                  className={`metric-value ${
                    availableCount > 0 ? 'avail-green' : 'avail-red'
                  }`}
                >
                  {availableCount} of {facilitiesList.length} BSFs
                </span>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Main Container */}
      <div className="locator-main-container">
        {/* Filter Controls Bar */}
        <div className="filter-section-wrapper">
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

            <div className="location-display-box" title={currentOrigin.name}>
              <span className="location-display-icon">
                <PinIcon size={16} />
              </span>
              <span className="location-display-name">{currentOrigin.name}</span>
            </div>

            <button
              type="button"
              className="btn-change-location"
              onClick={() => setShowLocationModal(true)}
            >
              <PinIcon size={14} />
              <span>Change Location</span>
            </button>

            <button
              type="button"
              className="btn-change-location"
              onClick={handleUseMyLocation}
              disabled={isLocating}
              title="Detect my current location"
            >
              {isLocating ? (
                <RefreshIcon size={14} spinning />
              ) : (
                <PinIcon size={14} />
              )}
              <span>{isLocating ? 'Locating…' : 'Use My Location'}</span>
            </button>

            <div className="radius-select-box">
              <span className="radius-label">Radius:</span>
              <select
                className="radius-select"
                value={selectedRadiusKm === null ? 'all' : selectedRadiusKm}
                onChange={(e) =>
                  setSelectedRadiusKm(e.target.value === 'all' ? null : Number(e.target.value))
                }
              >
                <option value="all">All distances</option>
                <option value={5}>Within 5 km</option>
                <option value={10}>Within 10 km</option>
                <option value={15}>Within 15 km</option>
                <option value={30}>Within 30 km</option>
                <option value={50}>Within 50 km</option>
              </select>
            </div>
          </div>

          <div className="bt-component-row">
            <div className="bt-group">
              <span className="bt-group-label">Blood Type <small>Select one or more</small></span>
              {bloodTypes.map((bt) => (
                <button
                  key={bt}
                  type="button"
                  className={`bt-pill-btn ${
                    selectedBloodTypes.includes(bt) ? 'active' : ''
                  }`}
                  aria-pressed={selectedBloodTypes.includes(bt)}
                  onClick={() => toggleBloodType(bt)}
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

          <div className="hierarchy-filter-row">
            <div className="hierarchy-group">
              <span className="hierarchy-label">Hierarchy Search:</span>
              <button
                type="button"
                className={`hierarchy-btn ${
                  hierarchyMode === 'prc-first' ? 'active' : ''
                }`}
                onClick={() => setHierarchyMode('prc-first')}
              >
                1. PRC First, then Participating BSFs (Recommended)
              </button>
              <button
                type="button"
                className={`hierarchy-btn ${
                  hierarchyMode === 'prc-only' ? 'active' : ''
                }`}
                onClick={() => setHierarchyMode('prc-only')}
              >
                PRC Chapters Only
              </button>
              <button
                type="button"
                className={`hierarchy-btn ${
                  hierarchyMode === 'bsf-only' ? 'active' : ''
                }`}
                onClick={() => setHierarchyMode('bsf-only')}
              >
                BSFs Only
              </button>
            </div>

            <label className="checkbox-available-only">
              <input
                type="checkbox"
                checked={hideUnavailable}
                onChange={(e) => setHideUnavailable(e.target.checked)}
              />
              <span>
                Show 'Available' or 'Low' only (Hide Unavailable)
              </span>
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

        {/* Content Area */}
        <div className={`split-view-layout ${viewMode}`}>
          {(viewMode === 'split' || viewMode === 'map-only') && (
            <div className="map-column">
              <MapLibreView
                facilities={filteredFacilities}
                selectedFacility={selectedFacility}
                onSelectFacility={handleSelectFacility}
                selectedBloodTypes={selectedBloodTypes}
                selectedComponent={selectedComponent}
                currentOrigin={currentOrigin}
              />
            </div>
          )}

          {(viewMode === 'split' || viewMode === 'list-only') && (
            <div className="cards-column" ref={cardsColumnRef}>
              {selectedFacilityInResults && (
                <>
                  <div className="priority-section-header selected-facility-heading">
                    <h4 className="priority-title">
                      <span className={`priority-dot ${selectedFacilityInResults.category === 'PRC' ? 'prc' : 'bsf'}`}></span>
                      <span>SELECTED FACILITY</span>
                    </h4>
                    <span className="priority-sub">Shown first beside the map</span>
                  </div>
                  <FacilityCard
                    key={`selected-${selectedFacilityInResults.facilityID || selectedFacilityInResults.id}`}
                    facility={selectedFacilityInResults}
                    selectedBloodTypes={selectedBloodTypes}
                    selectedComponent={selectedComponent}
                    isSelected
                    onSelect={handleSelectFacility}
                  />
                </>
              )}

              {remainingPrcFacilities.length > 0 && (
                <>
                  <div className="priority-section-header">
                    <h4 className="priority-title">
                      <span className="priority-dot prc"></span>
                      <span>
                        PRIORITY 1: PHILIPPINE RED CROSS (PRC) CHAPTERS
                      </span>
                      <span className="priority-count">
                        ({remainingPrcFacilities.length} branches)
                      </span>
                    </h4>
                    <span className="priority-sub">Sorted by nearest distance</span>
                  </div>

                  {remainingPrcFacilities.map((fac) => (
                    <FacilityCard
                      key={fac.facilityID || fac.id}
                      facility={fac}
                      selectedBloodTypes={selectedBloodTypes}
                      selectedComponent={selectedComponent}
                      isSelected={isSameFacility(selectedFacility, fac)}
                      onSelect={handleSelectFacility}
                    />
                  ))}
                </>
              )}

              {remainingBsfFacilities.length > 0 && (
                <>
                  <div
                    className="priority-section-header"
                    style={{ marginTop: '1.5rem' }}
                  >
                    <h4 className="priority-title">
                      <span className="priority-dot bsf"></span>
                      <span>
                        PRIORITY 2: PARTICIPATING BLOOD SERVICE
                        FACILITIES (BSFs)
                      </span>
                      <span className="priority-count">
                        ({remainingBsfFacilities.length} facilities)
                      </span>
                    </h4>
                    <span className="priority-sub">Sorted by nearest distance</span>
                  </div>

                  {remainingBsfFacilities.map((fac) => (
                    <FacilityCard
                      key={fac.facilityID || fac.id}
                      facility={fac}
                      selectedBloodTypes={selectedBloodTypes}
                      selectedComponent={selectedComponent}
                      isSelected={isSameFacility(selectedFacility, fac)}
                      onSelect={handleSelectFacility}
                    />
                  ))}
                </>
              )}

              {filteredFacilities.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '3rem 1rem',
                    background: '#fff',
                    borderRadius: 12,
                    border: '1px solid #e2e8f0',
                  }}
                >
                  <div
                    style={{
                      color: '#94a3b8',
                      display: 'flex',
                      justifyContent: 'center',
                      marginBottom: '0.75rem',
                    }}
                  >
                    <ShieldAlertIcon size={40} />
                  </div>
                  <h4 style={{ margin: '0.5rem 0 0.25rem', color: '#0f172a' }}>
                    No Blood Service Facilities Found
                  </h4>
                  <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
                    Try expanding your search radius.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Change Location Modal */}
      {showLocationModal && (
        <ChangeLocationModal
          currentOrigin={currentOrigin}
          onSelectCity={(city) =>
            setCurrentOrigin({
              name: city.name,
              lat: Number(city.lat),
              lon: Number(city.lon),
              region: city.region,
            })
          }
          onUseMyLocation={handleUseMyLocation}
          isLocating={isLocating}
          onClose={() => setShowLocationModal(false)}
        />
      )}

      {/* Admin Add Branch Modal */}
      {isAdmin && showAdminModal && (
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

      {locationError && (
        <div
          className="bbis-toast"
          style={{ background: '#dc2626', borderColor: '#991b1b' }}
        >
          <ShieldAlertIcon size={16} />
          <span>{locationError}</span>
        </div>
      )}
    </div>
  );

  if (!showRecipientSidebar) return locator;

  return (
    <div className="dashboard-container donor-theme ui-dashboard">
      <DonorSidebar
        role="recipient"
        firstName={donor?.firstName}
        onChangeRole={() => {
          localStorage.removeItem('donorHubRole');
          navigate('/DonorDashboard');
        }}
        onLogout={async () => {
          localStorage.removeItem('donorHubRole');
          await logoutDonor();
          navigate('/Login', { replace: true });
        }}
      />

      <main className="dashboard-content">
        {locator}
      </main>
    </div>
  );

}
