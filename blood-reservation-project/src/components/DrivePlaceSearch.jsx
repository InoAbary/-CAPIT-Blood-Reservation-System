import { useState } from 'react';
import { useMapsLibrary } from '@vis.gl/react-google-maps';

async function searchPlaces(places, query) {
  if (places?.Place) {
    try {
      const { places: results = [] } = await places.Place.searchByText({
        textQuery: query, region: 'ph', language: 'en',
        fields: ['id', 'displayName', 'formattedAddress', 'location'], maxResultCount: 5,
      });
      const matches = results.filter(place => place.location).map(place => ({
        id: place.id, name: place.displayName || place.formattedAddress || query, address: place.formattedAddress,
        lat: place.location.lat(), lon: place.location.lng(), source: 'Google Maps',
      }));
      if (matches.length) return matches;
    } catch {
      // Try OpenStreetMap when Google Places is unavailable.
    }
  }

  try {
    const params = new URLSearchParams({ q: query, format: 'jsonv2', countrycodes: 'ph', limit: '5' });
    const response = await fetch(`https://nominatim.openstreetmap.org/search?${params}`);
    if (response.ok) {
      const results = await response.json();
      if (results.length) return results.map(place => ({
        id: place.place_id, name: place.name || place.display_name.split(',')[0],
        address: place.display_name, lat: Number(place.lat), lon: Number(place.lon),
        source: 'OpenStreetMap',
      }));
    }
  } catch {
    // The facility directory can still supply locations.
  }

  const response = await fetch('/api/facilities');
  if (!response.ok) throw new Error('Place search is unavailable. Try again.');
  const { facilities = [] } = await response.json();
  const text = query.toLowerCase();
  return facilities.filter(facility =>
    Number.isFinite(facility.lat) && Number.isFinite(facility.lon) &&
    [facility.facilityName, facility.address].some(value => value?.toLowerCase().includes(text)))
    .slice(0, 5).map(facility => ({
      id: facility._id, name: facility.facilityName, address: facility.address,
      lat: facility.lat, lon: facility.lon, source: 'Sandugo facility directory',
    }));
}

export default function DrivePlaceSearch({ onSelect }) {
  const places = useMapsLibrary('places');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState('');
  const [searching, setSearching] = useState(false);

  async function search() {
    const text = query.trim();
    if (text.length < 2 || searching) return;
    setSearching(true);
    setMessage('');
    setResults([]);
    try {
      const matches = await searchPlaces(places, text);
      setResults(matches);
      if (!matches.length) setMessage('No places found. Try a venue name, street, or city.');
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="drive-place-search">
      <label>Search for a place
        <input type="search" value={query} disabled={searching} placeholder="Venue name, street, or city"
          onChange={event => { setQuery(event.target.value); setResults([]); setMessage(''); }}
          onKeyDown={event => {
            if (event.key === 'Enter') { event.preventDefault(); search(); }
          }} />
      </label>
      <div className="drive-actions">
        <button type="button" disabled={searching || query.trim().length < 2} onClick={search}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>
      {(searching || message || results.length > 0) && <p className="drive-feedback" role="status">
        {searching ? 'Searching for places…' : message || `${results.length} matching places`}
      </p>}
      {!!results.length && <ul className="drive-place-results">
        {results.map(place => <li key={place.id}><button type="button" onClick={() => {
          setQuery(place.name); setResults([]); onSelect(place);
        }}>
          <strong>{place.name}</strong><span>{place.address}</span><small>{place.source}</small>
        </button></li>)}
      </ul>}
    </div>
  );
}
