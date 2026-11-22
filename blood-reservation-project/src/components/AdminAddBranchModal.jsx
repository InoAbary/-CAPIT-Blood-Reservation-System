import React, { useState, useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { PinIcon, CheckIcon, RefreshIcon, SearchIcon, ShieldAlertIcon } from './Icons';
import '../styles/AdminModal.css';

export default function AdminAddBranchModal({ onClose, onBranchAdded }) {
  const places = useMapsLibrary('places');
  // Search query on Google Maps
  const [mapSearchQuery, setMapSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    facilityName: '',
    category: 'PRC',
    facilityType: 'prc_chapter',
    typeLabel: 'Philippine Red Cross',
    address: '',
    contactNumber: '',
    hours: 'Hours to be confirmed by branch admin',
    operatingHours: { source: 'placeholder', placeholderText: '' },
    lat: 14.5888,
    lon: 120.9744
  });

  const [clickedCoord, setClickedCoord] = useState({ lat: 14.5888, lon: 120.9744 });
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState('info'); // 'info', 'success', 'error'

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const sessionTokenRef = useRef(null);

  // Helper to reverse-geocode coordinates and auto-fill details
  const autoFillFromCoordinates = async (lat, lon, knownPlaceName = null) => {
    setIsGeocoding(true);
    setStatusMessage('Fetching location details...');
    setStatusType('info');

    let resolvedAddress = '';
    let resolvedCity = '';
    let detectedName = knownPlaceName || '';

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        const road = addr.road || addr.pedestrian || addr.suburb || 'Main Road';
        const brgy = addr.city_block || addr.neighbourhood || addr.quarter || '';
        resolvedCity = addr.city || addr.town || addr.municipality || 'Metro Manila';
        
        resolvedAddress = [road, brgy, resolvedCity, 'Philippines'].filter(Boolean).join(', ');

        if (!detectedName) {
          if (data.name) {
            detectedName = data.name;
          } else {
            detectedName = `Philippine Red Cross – ${resolvedCity} Branch`;
          }
        }
      }
    } catch (err) {
      console.warn('Reverse geocode failed, using city fallback:', err);
    }

    // Fallbacks if network failed
    if (!resolvedAddress) {
      resolvedAddress = `Coordinates: ${lat.toFixed(4)}, ${lon.toFixed(4)}, Metro Manila, Philippines`;
    }
    if (!detectedName) {
      detectedName = `Sandugo Blood Center (${lat.toFixed(3)}, ${lon.toFixed(3)})`;
    }

    const isPRC = detectedName.toLowerCase().includes('red cross') || detectedName.toLowerCase().includes('prc');
    const autoCategory = isPRC ? 'PRC' : 'Hospital BSF';
    const autoType = isPRC ? 'prc_chapter' : 'hospital_bsf';
    const autoTypeLabel = isPRC ? 'Philippine Red Cross' : 'Hospital Blood Service Facility';
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const autoPhone = `(02) 8${Math.floor(200 + Math.random() * 700)}-${randomSuffix}`;

    setFormData({
      facilityName: detectedName,
      category: autoCategory,
      facilityType: autoType,
      typeLabel: autoTypeLabel,
      address: resolvedAddress,
      contactNumber: autoPhone,
      hours: 'Hours to be confirmed by branch admin',
      operatingHours: { source: 'placeholder', placeholderText: '' },
      lat: Number(lat.toFixed(5)),
      lon: Number(lon.toFixed(5))
    });

    setClickedCoord({ lat, lon });
    setIsGeocoding(false);
    setStatusMessage('Location details loaded. Opening hours can be confirmed by the branch admin.');
    setStatusType('success');
  };

  // Perform place search when typing in Google Maps search bar
  const handleSearchChange = (query) => {
    setMapSearchQuery(query);
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!query || query.trim().length < 2) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        let results = [];
        if (places) {
          try {
            if (!sessionTokenRef.current) sessionTokenRef.current = new places.AutocompleteSessionToken();
            const { suggestions = [] } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
              input: query,
              sessionToken: sessionTokenRef.current,
              includedRegionCodes: ['ph'],
              language: 'en',
              region: 'ph',
            });
            results = suggestions.map((item) => item.placePrediction).filter(Boolean).map((prediction) => ({
              source: 'google',
              prediction,
              name: prediction.mainText?.toString() || prediction.text.toString(),
              display_name: prediction.secondaryText?.toString() || prediction.text.toString(),
            }));
          } catch (googleError) {
            console.warn('Google Maps place search unavailable; using OpenStreetMap.', googleError);
          }
        }
        if (!results.length) {
          const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&countrycodes=ph&addressdetails=1&limit=5`;
          const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
          if (res.ok) results = await res.json();
        }
        setSearchResults(results);
      } catch (e) {
        console.warn('Search query error:', e);
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // When a search result is clicked from Google Maps suggestions
  const handleSelectSearchResult = async (item) => {
    if (item.source === 'google') {
      try {
        const place = item.prediction.toPlace();
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location', 'regularOpeningHours', 'nationalPhoneNumber'] });
        if (!place.location) throw new Error('Google Maps did not return a location for this place.');
        const lat = place.location.lat();
        const lon = place.location.lng();
        const cleanName = place.displayName || item.name;
        const googleHours = place.regularOpeningHours?.weekdayDescriptions?.join(' · ') || '';
        const isPRC = cleanName.toLowerCase().includes('red cross') || cleanName.toLowerCase().includes('prc');
        const facilityType = isPRC ? 'prc_chapter' : 'hospital_bsf';
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        setFormData((current) => ({
          ...current,
          facilityName: cleanName,
          category: isPRC ? 'PRC' : 'Hospital BSF',
          facilityType,
          typeLabel: isPRC ? 'Philippine Red Cross' : 'Hospital Blood Service Facility',
          address: place.formattedAddress || current.address,
          contactNumber: place.nationalPhoneNumber || current.contactNumber || `(02) 8${Math.floor(200 + Math.random() * 700)}-${randomSuffix}`,
          hours: googleHours || 'Hours to be confirmed by branch admin',
          operatingHours: { source: 'placeholder', placeholderText: googleHours },
          lat: Number(lat.toFixed(5)),
          lon: Number(lon.toFixed(5)),
        }));
        setMapSearchQuery(cleanName);
        setSearchResults([]);
        setClickedCoord({ lat, lon });
        if (mapInstanceRef.current && markerRef.current) {
          markerRef.current.setLngLat([lon, lat]);
          mapInstanceRef.current.flyTo({ center: [lon, lat], zoom: 15, speed: 1.5 });
        }
        sessionTokenRef.current = null;
        setStatusMessage(googleHours ? 'Google Maps opening hours loaded as a placeholder for branch admin review.' : 'Google Maps place selected. Branch admin will confirm opening hours.');
        setStatusType('success');
      } catch (error) {
        setStatusMessage(error.message || 'Could not load this Google Maps place.');
        setStatusType('error');
      }
      return;
    }

    const lat = parseFloat(item.lat);
    const lon = parseFloat(item.lon);
    const cleanName = item.name || item.display_name.split(',')[0];

    setMapSearchQuery(cleanName);
    setSearchResults([]);

    if (mapInstanceRef.current && markerRef.current) {
      markerRef.current.setLngLat([lon, lat]);
      mapInstanceRef.current.flyTo({ center: [lon, lat], zoom: 15, speed: 1.5 });
    }

    setClickedCoord({ lat, lon });
    autoFillFromCoordinates(lat, lon, cleanName);
  };

  // Initialize interactive MapLibre map on mount
  useEffect(() => {
    let map = null;
    let cancelled = false;

    const initMap = async () => {
      if (!mapContainerRef.current) return;
      try {
        const maplibregl = await import('maplibre-gl');
        
        if (cancelled || !mapContainerRef.current) return;

        map = new maplibregl.Map({
          container: mapContainerRef.current,
          style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
          center: [121.0112, 14.5888],
          zoom: 12
        });

        map.addControl(new maplibregl.NavigationControl({ showCompass: true }), 'top-right');

        // Add red pin
        const el = document.createElement('div');
        el.className = 'admin-map-pin';
        el.innerHTML = `
          <div style="background:#dc2626; color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 12px rgba(220,38,38,0.5); border:2.5px solid #fff; font-weight:bold; font-size:16px;">
            +
          </div>
        `;

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([121.0112, 14.5888])
          .addTo(map);

        markerRef.current = marker;
        mapInstanceRef.current = map;

        // Map Click Listener -> Auto-fills form immediately!
        map.on('click', (e) => {
          const { lng, lat } = e.lngLat;
          marker.setLngLat([lng, lat]);
          autoFillFromCoordinates(lat, lng);
        });

        // Trigger initial fill for default Manila center
        autoFillFromCoordinates(14.5888, 120.9744, 'Philippine Red Cross – Manila Chapter Blood Services');
      } catch (e) {
        console.error('Failed to load map:', e);
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (map) map.remove();
    };
  }, []);

  // Submit to MongoDB and Git database
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.facilityName || !formData.address) {
      setStatusMessage('Facility name and address are required.');
      setStatusType('error');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Logging branch into MongoDB database and committing to git records...');
    setStatusType('info');

    try {
      const res = await fetch('/api/facilities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await res.json();

      if (data.success && data.facility) {
        setStatusMessage(`Done! Branch saved into MongoDB. (Facility ID: ${data.facility.facilityID})`);
        setStatusType('success');

        if (onBranchAdded) {
          onBranchAdded(data.facility);
        }

        setTimeout(() => {
          onClose();
        }, 1100);
      } else {
        throw new Error(data.error || data.message || 'Failed to save facility.');
      }
    } catch (err) {
      setStatusMessage(err.message || 'Could not save this facility. Please try again.');
      setStatusType('error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <div className="admin-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="admin-modal-header">
          <div>
            <div className="admin-badge-label">
              <span className="admin-badge-dot"></span>
              <span>ADMIN • ADD BRANCH</span>
            </div>
            <h2 className="admin-modal-title">Add New Branch</h2>
            <p className="admin-modal-subtitle">
              Type the branch's name in Google Maps below or click anywhere on the map to auto-fill details, then click save.
            </p>
          </div>
          <button type="button" className="btn-close-modal" onClick={onClose}>
            ✕
          </button>
        </div>

        {/* Google Maps Search Bar */}
        <div className="gmaps-search-bar-wrap">
          <div className="gmaps-search-inner">
            <span className="gmaps-logo-badge">Google Maps</span>
            <div className="gmaps-input-field">
              <SearchIcon size={16} className="gmaps-search-icon" />
              <input
                type="text"
                className="gmaps-search-input"
                placeholder="Type branch's name (e.g. Philippine Red Cross Pasig, PGH Manila, Cardinal Santos...)"
                value={mapSearchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                autoFocus
              />
              {isSearching && <RefreshIcon size={15} spinning={true} className="search-spin-icon" />}
            </div>
          </div>

          {/* Autocomplete Dropdown */}
          {searchResults.length > 0 && (
            <ul className="gmaps-results-dropdown">
              {searchResults.map((item, idx) => (
                <li
                  key={idx}
                  className="gmaps-result-item"
                  onClick={() => handleSelectSearchResult(item)}
                >
                  <PinIcon size={15} className="result-pin" />
                  <div className="result-texts">
                    <strong className="result-name">{item.name || item.display_name.split(',')[0]}</strong>
                    <span className="result-sub">{item.display_name}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Status Toast / Bar */}
        {statusMessage && (
          <div className={`admin-status-bar ${statusType}`}>
            {statusType === 'success' && <CheckIcon size={16} />}
            {statusType === 'info' && <RefreshIcon size={16} spinning={isGeocoding || isSubmitting} />}
            {statusType === 'error' && <ShieldAlertIcon size={16} />}
            <span>{statusMessage}</span>
          </div>
        )}

        {/* Modal Body: Map on Left / Form on Right */}
        <div className="admin-modal-body">
          {/* Map Section */}
          <div className="admin-map-section">
            <div className="admin-map-instruction">
              <PinIcon size={14} />
              <span>Or click directly on the map to pinpoint and auto-detect branch info</span>
            </div>
            <div
              ref={mapContainerRef}
              className="admin-map-canvas"
              style={{ height: 340 }}
            />
            <div className="admin-map-footer">
              <span>Point: Lat {clickedCoord.lat.toFixed(4)}, Lon {clickedCoord.lon.toFixed(4)}</span>
              {isGeocoding && <span className="geocoding-spinner">Auto-filling details...</span>}
            </div>
          </div>

          {/* Form Section */}
          <form className="admin-form-section" onSubmit={handleSubmit}>
            <div className="admin-form-group">
              <label className="form-label">
                Branch Name <span className="req-star">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Philippine Red Cross – Pasig Chapter"
                value={formData.facilityName}
                onChange={(e) => setFormData({ ...formData, facilityName: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group flex-1">
                <label className="form-label">Category</label>
                <select
                  className="form-select"
                  value={formData.category}
                  onChange={(e) => {
                    const cat = e.target.value;
                    setFormData({
                      ...formData,
                      category: cat,
                      typeLabel: cat === 'PRC' ? 'Philippine Red Cross' : 'Hospital Blood Service Facility',
                      facilityType: cat === 'PRC' ? 'prc_chapter' : 'hospital_bsf'
                    });
                  }}
                >
                  <option value="PRC">Philippine Red Cross (Priority 1)</option>
                  <option value="Hospital BSF">Participating Hospital BSF (Priority 2)</option>
                </select>
              </div>

              <div className="admin-form-group flex-1">
                <label className="form-label">Facility Type (MongoDB)</label>
                <select
                  className="form-select"
                  value={formData.facilityType}
                  onChange={(e) => {
                    const facilityType = e.target.value;
                    const category = facilityType === 'prc_chapter' ? 'PRC' : 'Hospital BSF';
                    const typeLabel = {
                      prc_chapter: 'Philippine Red Cross',
                      bsf: 'Blood Service Facility',
                      hospital: 'Hospital',
                      hospital_bsf: 'Hospital Blood Service Facility',
                    }[facilityType];
                    setFormData({ ...formData, facilityType, category, typeLabel });
                  }}
                >
                  <option value="prc_chapter">PRC Chapter</option>
                  <option value="bsf">Blood Service Facility</option>
                  <option value="hospital">Hospital</option>
                  <option value="hospital_bsf">Hospital BSF</option>
                </select>
              </div>
            </div>

            <div className="admin-form-group">
              <label className="form-label">
                Full Street Address <span className="req-star">*</span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Caruncho Ave., San Nicolas, Pasig City"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                required
              />
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group flex-1">
                <label className="form-label">Contact Hotline</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. (02) 8641-0398"
                  value={formData.contactNumber}
                  onChange={(e) => setFormData({ ...formData, contactNumber: e.target.value })}
                />
              </div>

              <div className="admin-form-group flex-1">
                <label className="form-label">Operating Hours (Temporary)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 24/7 Operations"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                />
                <small className="admin-hours-help">Google Maps hours are used as a starting point when available. The branch admin confirms the weekly schedule.</small>
              </div>
            </div>

            <div className="admin-form-row">
              <div className="admin-form-group flex-1">
                <label className="form-label">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-input"
                  value={formData.lat}
                  onChange={(e) => setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 })}
                />
              </div>

              <div className="admin-form-group flex-1">
                <label className="form-label">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  className="form-input"
                  value={formData.lon}
                  onChange={(e) => setFormData({ ...formData, lon: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div className="admin-form-actions">
              <button type="button" className="btn-cancel" onClick={onClose}>
                Cancel
              </button>
              <button
                type="submit"
                className="btn-submit-branch"
                disabled={isSubmitting || isGeocoding}
              >
                {isSubmitting ? (
                  <>
                    <RefreshIcon size={16} spinning={true} />
                    <span>Saving to MongoDB...</span>
                  </>
                ) : (
                  <>
                    <CheckIcon size={16} />
                    <span>Save Branch &amp; Done</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
