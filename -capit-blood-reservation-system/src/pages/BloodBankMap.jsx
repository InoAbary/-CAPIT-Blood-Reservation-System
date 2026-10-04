import React, { useState, useMemo, useEffect } from 'react';
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
import {
  BLOOD_TYPES,
  COMPONENTS,
  FACILITIES_DATA,
  CITIES,
} from '../data/prcFacilitiesData';
import './BloodLocator.css';

// Haversine formula to dynamically calculate real-time distance
function computeHaversineKm(lat1, lon1, lat2, lon2) {
  if (!lat1 || !lon1 || !lat2 || !lon2) return 5.0;
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
  // Facilities State (dynamic, backed by MongoDB and Git repository)
  const [facilitiesList, setFacilitiesList] = useState(FACILITIES_DATA);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodType, setSelectedBloodType] = useState('B-');
  const [selectedComponent, setSelectedComponent] = useState('Packed Red Blood Cells');
  const [selectedRadiusKm, setSelectedRadiusKm] = useState(30);
  const [hierarchyMode, setHierarchyMode] = useState('prc-first'); // 'prc-first', 'prc-only', 'bsf-only'
  const [hideUnavailable, setHideUnavailable] = useState(false);
  const [viewMode, setViewMode] = useState('split'); // 'split', 'map-only', 'list-only'
  const [currentOrigin, setCurrentOrigin] = useState(CITIES[0]); // City of Manila

  // Selected facility for map interaction / details modal
  const [selectedFacility, setSelectedFacility] = useState(FACILITIES_DATA[0]);

  // Modals state
  const [matrixModalFacility, setMatrixModalFacility] = useState(null);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showAdminModal, setShowAdminModal] = useState(false);

  // Sync toast state
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncToast, setSyncToast] = useState(null);

  // Fetch facilities from MongoDB / git store on mount
  useEffect(() => {
    const fetchRemoteFacilities = async () => {
      try {
        const res = await fetch('/api/facilities');
        const data = await res.json();
        if (data.success && Array.isArray(data.facilities) && data.facilities.length > 0) {
          // Merge remote facilities with local defaults
          const existingIds = new Set(data.facilities.map((f) => f.facilityID || f.id));
          const formattedRemote = data.facilities.map((f) => ({
            id: f.facilityID || f._id?.$oid || 'fac-' + Math.random(),
            facilityID: f.facilityID,
            name: f.facilityName || f.name,
            facilityName: f.facilityName || f.name,
            category: f.category || (f.facilityName?.includes('Red Cross') ? 'PRC' : 'Hospital BSF'),
            typeLabel: f.typeLabel || (f.category === 'PRC' ? 'Philippine Red Cross' : 'Hospital Blood Service Facility'),
            priority: f.category === 'PRC' ? 1 : 2,
            address: f.address,
            phone: f.contactNumber || f.contactNuber || f.phone || '(02) 8527-2195',
            hours: f.hours || '8:00 AM - 5:00 PM',
            lat: Number(f.lat) || 14.5995,
            lon: Number(f.lon) || 120.9842,
            matrix: f.matrix || FACILITIES_DATA[0].matrix,
            quote: f.quote || 'Integrated blood facility connected to central repository.',
            bbisSyncedMins: f.bbisSyncedMins || 15,
            isActive: f.isActive !== false
          }));

          // Merge any default facilities not in remote
          const merged = [...formattedRemote];
          FACILITIES_DATA.forEach((df) => {
            if (!existingIds.has(df.id) && !merged.some((m) => m.name === df.name)) {
              merged.push(df);
            }
          });

          setFacilitiesList(merged);
        }
      } catch (err) {
        console.warn('API facilities fetch fallback to local:', err);
      }
    };

    fetchRemoteFacilities();
  }, []);

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

  // Manual BBIS sync simulation
  const handleTriggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setSyncToast(
        `BBIS Central Network Re-synchronized: ${facilitiesList.length} Facilities reporting active cold-chain status.`
      );
      setTimeout(() => setSyncToast(null), 4000);
    }, 900);
  };

  // Callback when admin adds a new branch from map
  const handleBranchAdded = (newBranch) => {
    const formatted = {
      id: newBranch.facilityID || 'fac-' + Date.now(),
      facilityID: newBranch.facilityID,
      name: newBranch.facilityName || newBranch.name,
      facilityName: newBranch.facilityName || newBranch.name,
      category: newBranch.category || 'PRC',
      typeLabel: newBranch.typeLabel || 'Blood Service Facility',
      priority: newBranch.category === 'PRC' ? 1 : 2,
      address: newBranch.address,
      phone: newBranch.contactNumber || newBranch.phone || '(02) 8527-2195',
      hours: newBranch.hours || '8:00 AM - 5:00 PM',
      lat: Number(newBranch.lat) || 14.5995,
      lon: Number(newBranch.lon) || 120.9842,
      matrix: newBranch.matrix || FACILITIES_DATA[0].matrix,
      distanceKm: computeHaversineKm(currentOrigin.lat, currentOrigin.lon, newBranch.lat, newBranch.lon),
      travelTime: '~15 mins',
      isActive: true
    };

    setFacilitiesList((prev) => [formatted, ...prev]);
    setSelectedFacility(formatted);
    setSyncToast(`Branch "${formatted.name}" added to MongoDB & active on locator.`);
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
              <span className="metric-label">BBIS Live Sync</span>
              <div className="metric-value-row">
                <span className="metric-value sync-white">Central API Active</span>
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
              {BLOOD_TYPES.map((bt) => (
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
                {COMPONENTS.map((c) => (
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
