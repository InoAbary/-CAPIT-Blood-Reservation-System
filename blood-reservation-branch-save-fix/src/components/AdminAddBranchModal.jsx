import React, { useState, useEffect, useRef } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { PinIcon, CheckIcon, RefreshIcon, SearchIcon, ShieldAlertIcon } from './Icons';
import '../styles/AdminModal.css';

export default function AdminAddBranchModal({ onClose, onBranchAdded }) {
  const placesLibrary = useMapsLibrary('places');
  const placesLibraryRef = useRef(placesLibrary);
  // Google place suggestions give this branch its permanent, storable Place ID.
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
    hours: '',
    googlePlaceId: '',
    lat: 14.5888,
    lon: 120.9744
  });

  const [clickedCoord, setClickedCoord] = useState({ lat: 14.5888, lon: 120.9744 });
  const [locationSelected, setLocationSelected] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState(null);
  const [statusType, setStatusType] = useState('info'); // 'info', 'success', 'error'

  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const autocompleteSessionRef = useRef(null);

  useEffect(() => {
    placesLibraryRef.current = placesLibrary;
  }, [placesLibrary]);

  const googleMapsQuery = [formData.facilityName, formData.address].filter(Boolean).join(', ')
    || `${formData.lat},${formData.lon}`;
  const googleMapsUrl = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(googleMapsQuery)}`;

  const applyGooglePlace = (place) => {
    const weekdayHours = place.regularOpeningHours?.weekdayDescriptions?.join(' · ') || '';

    setFormData((previous) => ({
      ...previous,
      // Google Places content is shown live and is intentionally not sent to MongoDB.
      contactNumber: place.nationalPhoneNumber || place.internationalPhoneNumber || '',
      hours: weekdayHours,
      googlePlaceId: place.id || ''
    }));
  };

  // Helper to reverse-geocode coordinates, then match the selected location to a Google Place.
  const autoFillFromCoordinates = async (lat, lon, knownPlaceName = null) => {
    setIsGeocoding(true);
    setStatusMessage('Finding this branch in Google Maps...');
    setStatusType('info');

    let resolvedAddress = '';
    let detectedName = knownPlaceName || '';

    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      if (res.ok) {
        const data = await res.json();
        const addr = data.address || {};
        resolvedAddress = data.display_name || '';

        if (!detectedName) {
          detectedName = data.name || addr.amenity || '';
        }
      }
    } catch (err) {
      console.warn('Reverse geocode failed, using city fallback:', err);
    }

    const availablePlacesLibrary = placesLibraryRef.current;
    if (availablePlacesLibrary && (detectedName || resolvedAddress)) {
      try {
        const { places = [] } = await availablePlacesLibrary.Place.searchByText({
          textQuery: [detectedName, resolvedAddress].filter(Boolean).join(', '),
          fields: ['id', 'displayName', 'nationalPhoneNumber', 'internationalPhoneNumber', 'regularOpeningHours'],
          locationBias: { center: { lat, lng: lon }, radius: 1500 },
          region: 'ph',
          language: 'en'
        });
        const matchedPlace = places[0];
        if (matchedPlace) {
          await matchedPlace.fetchFields({
            fields: ['id', 'displayName', 'nationalPhoneNumber', 'internationalPhoneNumber', 'regularOpeningHours']
          });
          applyGooglePlace(matchedPlace);
          setMapSearchQuery(matchedPlace.displayName || detectedName);
          setIsGeocoding(false);
          setStatusMessage('Branch details loaded from Google Maps. Phone and hours will be fetched live when the locator is viewed.');
          setStatusType('success');
          return;
        }
      } catch (error) {
        console.warn('Google Places lookup failed:', error);
      }
    }

    const isPRC = detectedName.toLowerCase().includes('red cross') || detectedName.toLowerCase().includes('prc');
    const autoCategory = isPRC ? 'PRC' : 'Hospital BSF';
    const autoType = isPRC ? 'prc_chapter' : 'hospital';
    const autoTypeLabel = isPRC ? 'Philippine Red Cross' : 'Hospital Blood Service Facility';
    setFormData({
      facilityName: detectedName,
      category: autoCategory,
      facilityType: autoType,
      typeLabel: autoTypeLabel,
      address: resolvedAddress,
      contactNumber: '',
      hours: '',
      googlePlaceId: '',
      lat: Number(lat.toFixed(5)),
      lon: Number(lon.toFixed(5))
    });

    setClickedCoord({ lat, lon });
    setLocationSelected(true);
    setIsGeocoding(false);
    setStatusMessage(placesLibraryRef.current
      ? 'No matching Google Place was found. Check the branch name and address, then save the selected map point.'
      : 'Google Places is unavailable. Check the branch name and address, then save the selected map point.');
    setStatusType('info');
  };

  // Search for a facility directly with Google Places Autocomplete.
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

    if (!placesLibrary) {
      setSearchResults([]);
      setIsSearching(false);
      setStatusMessage('Google Places is unavailable. Configure VITE_GMAPS_API_KEY and enable Places API.');
      setStatusType('error');
      return;
    }

    setIsSearching(true);
    searchTimeoutRef.current = setTimeout(async () => {
      try {
        if (!autocompleteSessionRef.current) {
          autocompleteSessionRef.current = new placesLibrary.AutocompleteSessionToken();
        }
        const { suggestions = [] } = await placesLibrary.AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: query,
          includedRegionCodes: ['ph'],
          language: 'en',
          sessionToken: autocompleteSessionRef.current
        });
        setSearchResults(suggestions.map((suggestion) => suggestion.placePrediction).filter(Boolean));
      } catch (e) {
        console.warn('Search query error:', e);
        setStatusMessage('Google Maps search failed. Check the API key, Places API access, and billing settings.');
        setStatusType('error');
      } finally {
        setIsSearching(false);
      }
    }, 350);
  };

  // When a Google Places result is selected, fetch its contact fields for live display.
  const handleSelectSearchResult = async (prediction) => {
    setIsGeocoding(true);
    setStatusMessage('Loading branch details from Google Maps...');
    setStatusType('info');
    setSearchResults([]);
    try {
      const place = prediction.toPlace();
      await place.fetchFields({
        fields: ['id', 'displayName', 'formattedAddress', 'nationalPhoneNumber', 'internationalPhoneNumber', 'regularOpeningHours']
      });
      const osmResponse = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(`${place.displayName || ''} ${place.formattedAddress || ''}`)}&format=json&countrycodes=ph&addressdetails=1&limit=5`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const osmMatches = osmResponse.ok ? await osmResponse.json() : [];
      const osmMatch = osmMatches[0];
      if (!osmMatch) {
        throw new Error('No matching OpenStreetMap location was found. Click the map to set this branch location, then choose its Google Maps match.');
      }

      const lat = Number(osmMatch.lat);
      const lon = Number(osmMatch.lon);
      const osmName = osmMatch.name || osmMatch.display_name?.split(',')[0] || '';
      const isPRC = osmName.toLowerCase().includes('red cross') || osmName.toLowerCase().includes('prc');
      setFormData((previous) => ({
        ...previous,
        facilityName: osmName,
        category: isPRC ? 'PRC' : 'Hospital BSF',
        facilityType: isPRC ? 'prc_chapter' : 'hospital',
        typeLabel: isPRC ? 'Philippine Red Cross' : 'Hospital Blood Service Facility',
        address: osmMatch.display_name || '',
        lat,
        lon
      }));
      setClickedCoord({ lat, lon });
      setLocationSelected(true);
      markerRef.current?.setLngLat([lon, lat]);
      mapInstanceRef.current?.flyTo({ center: [lon, lat], zoom: 15, speed: 1.5 });
      applyGooglePlace(place);
      setMapSearchQuery(place.displayName || prediction.text.toString());
      setStatusMessage('Branch location loaded from OpenStreetMap; phone and hours loaded live from Google Maps.');
      setStatusType('success');
    } catch (error) {
      console.error('Load Google Place details failed:', error);
      setStatusMessage('Could not load that branch from Google Maps. Please choose another result.');
      setStatusType('error');
    } finally {
      autocompleteSessionRef.current = null;
      setIsGeocoding(false);
    }
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

        map = new maplibregl.default.Map({
          container: mapContainerRef.current,
          style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
          center: [121.0112, 14.5888],
          zoom: 12
        });

        map.addControl(new maplibregl.default.NavigationControl({ showCompass: true }), 'top-right');

        // Add red pin
        const el = document.createElement('div');
        el.className = 'admin-map-pin';
        el.innerHTML = `
          <div style="background:#dc2626; color:#fff; width:34px; height:34px; border-radius:50%; display:flex; align-items:center; justify-content:center; box-shadow:0 3px 12px rgba(220,38,38,0.5); border:2.5px solid #fff; font-weight:bold; font-size:16px;">
            +
          </div>
        `;

        const marker = new maplibregl.default.Marker({ element: el })
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

      } catch (e) {
        console.error('Failed to load map:', e);
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
      if (map) map.remove();
    };
  }, []);

  // Save the facility to MongoDB through the authenticated API.
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!locationSelected || !formData.facilityName.trim() || !formData.address.trim()) {
      setStatusMessage('Select a map point and provide the branch name and address before saving.');
      setStatusType('error');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage('Saving facility to MongoDB...');
    setStatusType('info');

    try {
      const res = await fetch('/api/locator/facilities', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          // Phone and opening hours are fetched live and are never persisted.
          contactNumber: '',
          hours: ''
        })
      });

      const data = await res.json();

      if (res.ok && data.success && data.facility) {
        setStatusMessage(`Done! ${data.facility.facilityName} was saved to MongoDB.`);
        setStatusType('success');

        if (onBranchAdded) {
          onBranchAdded(data.facility);
        }

        setTimeout(() => {
          onClose();
        }, 1100);
      } else {
        throw new Error(data.message || data.error || 'Failed to save facility.');
      }
    } catch (err) {
      console.error('Save locator facility failed:', err);
      setStatusMessage(err.message || 'Unable to save the facility. Check your staff login and try again.');
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
              Search and select the branch from Google Maps. Its name, address, phone, and hours fill automatically.
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
                  <strong className="result-name">{item.mainText?.text || item.text?.toString()}</strong>
                    <span className="result-sub">{item.secondaryText?.text || 'Google Maps result'}</span>
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
              <span>Or click the map to select a point, then choose its matching Google Maps branch</span>
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
                      facilityType: cat === 'PRC' ? 'prc_chapter' : 'hospital'
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
                  onChange={(e) => setFormData({ ...formData, facilityType: e.target.value })}
                >
                  <option value="bsf">BSF (Blood Service Facility)</option>
                  <option value="hospital">Hospital Blood Bank</option>
                  <option value="prc_chapter">PRC Chapter</option>
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
                  readOnly
                  placeholder="Loaded from Google Maps when available"
                />
              </div>

              <div className="admin-form-group flex-1">
                <label className="form-label">Operating Hours</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. 24/7 Operations"
                  value={formData.hours}
                  onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
                  readOnly
                  placeholder="Loaded from Google Maps when available"
                />
              </div>
            </div>

            <p className="admin-maps-lookup-note">
              Contact and hours are shown live from Google Maps. MongoDB stores the Google Place ID and branch record; Google phone and hours are not permanently copied.
              {locationSelected && (
                <a href={googleMapsUrl} target="_blank" rel="noopener noreferrer">
                  {' '}Open this location in Google Maps ↗
                </a>
              )}
            </p>

            <div className="admin-form-row">
              <div className="admin-form-group flex-1">
                <label className="form-label">Latitude</label>
                <input
                  type="number"
                  step="0.0001"
                  min="-90"
                  max="90"
                  className="form-input"
                  value={formData.lat}
                  onChange={(e) => {
                    setFormData({ ...formData, lat: parseFloat(e.target.value) || 0 });
                    setLocationSelected(true);
                  }}
                  required
                />
              </div>

              <div className="admin-form-group flex-1">
                <label className="form-label">Longitude</label>
                <input
                  type="number"
                  step="0.0001"
                  min="-180"
                  max="180"
                  className="form-input"
                  value={formData.lon}
                  onChange={(e) => {
                    setFormData({ ...formData, lon: parseFloat(e.target.value) || 0 });
                    setLocationSelected(true);
                  }}
                  required
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
