import React, { useEffect, useRef, useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';
import { PinIcon, SearchIcon, RefreshIcon } from './Icons';

async function searchOpenStreetMap(query, currentOrigin) {
  const params = new URLSearchParams({ q: query, limit: '6', lang: 'en', countrycode: 'PH' });
  if (Number.isFinite(Number(currentOrigin?.lat)) && Number.isFinite(Number(currentOrigin?.lon))) {
    params.set('lat', String(currentOrigin.lat));
    params.set('lon', String(currentOrigin.lon));
    params.set('zoom', '11');
    params.set('location_bias_scale', '0.1');
  }

  const response = await fetch(`https://photon.komoot.io/api/?${params}`);
  if (!response.ok) throw new Error('Location search request failed.');
  const data = await response.json();

  return (data.features || []).flatMap((feature) => {
    const [lon, lat] = feature.geometry?.coordinates || [];
    const properties = feature.properties || {};
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return [];

    const locality = [properties.city, properties.state, properties.country]
      .filter((part, index, all) => part && all.indexOf(part) === index)
      .join(', ');
    const address = [properties.street, properties.housenumber, locality]
      .filter((part, index, all) => part && all.indexOf(part) === index)
      .join(', ');
    const name = properties.name || locality || address || query;

    return [{
      id: `${properties.osm_type || 'place'}-${properties.osm_id || `${lat}-${lon}`}`,
      name,
      address: address && address !== name ? address : locality,
      label: [name, address && address !== name ? address : null].filter(Boolean).join(' · '),
      lat,
      lon,
      source: 'openstreetmap',
    }];
  });
}

export default function ChangeLocationModal({
  currentOrigin,
  onSelectCity,
  onClose,
  onUseMyLocation,
  isLocating = false,
  locationError = '',
  tag = 'Geographical Reference Origin',
  title = 'Change Location Reference',
  description = 'Search for a place or address to center the locator.',
}) {
  const places = useMapsLibrary('places');
  const sessionTokenRef = useRef(null);
  const requestIdRef = useRef(0);
  const [query, setQuery] = useState('');
  const [placeSuggestions, setPlaceSuggestions] = useState([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [isSelectingPlace, setIsSelectingPlace] = useState(false);
  const [placesError, setPlacesError] = useState(false);

  useEffect(() => {
    const search = query.trim();
    const requestId = ++requestIdRef.current;

    if (search.length < 2) {
      setPlaceSuggestions([]);
      setIsSearchingPlaces(false);
      setPlacesError(false);
      return undefined;
    }

    setPlaceSuggestions([]);
    setIsSearchingPlaces(true);
    setPlacesError(false);
    const timer = window.setTimeout(async () => {
      try {
        let results = [];
        if (places) {
          try {
            if (!sessionTokenRef.current) {
              sessionTokenRef.current = new places.AutocompleteSessionToken();
            }
            const { suggestions = [] } = await places.AutocompleteSuggestion.fetchAutocompleteSuggestions({
              input: search,
              sessionToken: sessionTokenRef.current,
              includedRegionCodes: ['ph'],
              language: 'en',
              region: 'ph',
            });
            results = suggestions
              .map((item) => item.placePrediction)
              .filter(Boolean)
              .map((prediction) => ({
                id: prediction.placeId || prediction.text.toString(),
                label: prediction.text.toString(),
                source: 'google',
                prediction,
              }));
          } catch (error) {
            console.warn('Google Maps place search is unavailable; trying OpenStreetMap:', error);
          }
        }

        if (results.length === 0) results = await searchOpenStreetMap(search, currentOrigin);
        if (requestId !== requestIdRef.current) return;
        setPlaceSuggestions(results);
        setPlacesError(false);
      } catch (error) {
        if (requestId !== requestIdRef.current) return;
        console.warn('Location search is unavailable:', error);
        setPlaceSuggestions([]);
        setPlacesError(true);
      } finally {
        if (requestId === requestIdRef.current) setIsSearchingPlaces(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [places, query, currentOrigin]);

  const selectLocation = (location) => {
    onSelectCity({
      name: location.name,
      lat: Number(location.lat),
      lon: Number(location.lon),
      region: location.region,
    });
    onClose();
  };

  const selectPlace = async (result) => {
    setIsSelectingPlace(true);
    setPlacesError(false);
    try {
      if (result.source === 'google') {
        const place = result.prediction.toPlace();
        await place.fetchFields({ fields: ['displayName', 'formattedAddress', 'location'] });
        if (!place.location) throw new Error('Google Maps did not return a location for that result.');

        const name = place.displayName || place.formattedAddress || result.label;
        sessionTokenRef.current = null;
        selectLocation({
          name,
          lat: place.location.lat(),
          lon: place.location.lng(),
          region: place.formattedAddress || 'Google Maps',
        });
      } else {
        selectLocation({
          name: result.name,
          lat: result.lat,
          lon: result.lon,
          region: result.address || 'OpenStreetMap',
        });
      }
    } catch (error) {
      console.warn('Could not select map location:', error);
      setPlacesError(true);
      setIsSelectingPlace(false);
    }
  };

  return (
    <div
      className="modal-overlay location-modal-overlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="location-modal-title"
    >
      <div className="modal-content location-modal-content" onClick={(event) => event.stopPropagation()}>
        <div className="request-modal-header location-modal-header">
          <div>
            <span className="request-module-tag">{tag}</span>
            <h3 id="location-modal-title">{title}</h3>
            <p className="request-header-sub">
              {description}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose} aria-label="Close location search">✕</button>
        </div>

        <div className="location-modal-body">
          <div className="location-search-row search-input-wrapper">
            <SearchIcon size={16} className="search-icon" />
            <input
              type="text"
              className="search-input"
              placeholder="Search for a place or address…"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              autoComplete="off"
              aria-label="Search for a location"
              aria-controls="google-place-suggestions"
              aria-expanded={placeSuggestions.length > 0}
            />
          </div>

          {(placeSuggestions.length > 0 || isSearchingPlaces) && (
            <div className="location-place-search-panel">
              {isSearchingPlaces && <div className="location-search-status">Searching Google Maps…</div>}
              {placeSuggestions.length > 0 && (
                <div id="google-place-suggestions" className="location-place-suggestions" role="listbox">
                  {placeSuggestions.map((result, index) => (
                    <button
                      key={`${result.id}-${index}`}
                      type="button"
                      className="location-place-option"
                      role="option"
                      onClick={() => selectPlace(result)}
                      disabled={isSelectingPlace}
                    >
                      <PinIcon size={16} />
                      <span>{result.label}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="location-search-attribution" translate="no">
                {placeSuggestions[0]?.source === 'google' ? 'Google Maps' : '© OpenStreetMap contributors'}
              </div>
            </div>
          )}

          {query.trim().length >= 3 && !isSearchingPlaces && !placeSuggestions.length && !placesError && (
            <p className="location-search-status">No places found. Try a nearby town or a different spelling.</p>
          )}

          {isSelectingPlace && <p className="location-search-status">Setting your reference point…</p>}
          {placesError && (
            <p className="location-search-error">
              Place search is unavailable right now. Please try again or use your current location.
            </p>
          )}

          {onUseMyLocation && (
            <button
              type="button"
              className="use-my-location-btn"
              onClick={onUseMyLocation}
              disabled={isLocating}
            >
              {isLocating ? <RefreshIcon size={14} spinning /> : <PinIcon size={14} />}
              <span>{isLocating ? 'Locating…' : 'Use my current location'}</span>
            </button>
          )}
          {locationError && <p className="location-search-error" role="alert">{locationError}</p>}

        </div>

        <div className="matrix-modal-footer location-modal-footer">
          <button type="button" className="btn-modal-cancel" onClick={onClose} style={{ marginLeft: 'auto' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
