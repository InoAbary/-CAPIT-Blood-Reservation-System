import { useCallback, useEffect, useRef, useState } from 'react';
import Map, { Marker, NavigationControl } from 'react-map-gl/maplibre';
import 'maplibre-gl/dist/maplibre-gl.css';
import DrivePlaceSearch from './DrivePlaceSearch';
import { DriveCard, DriveStatusFilter, driveStatus } from '../pages/BloodDrives';

const endpoint = '/api/blood-drives/manage';
const fields = [
  ['title', 'Drive name', 120], ['venue', 'Venue name', 160], ['address', 'Full address', 300],
  ['startDate', 'Start date'], ['startTime', 'Start time'],
  ['endDate', 'End date'], ['endTime', 'End time'],
  ['lat', 'Latitude'], ['lon', 'Longitude'],
];
const manilaIsodate = value => new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
}).format(new Date(value)).replace(' ', 'T');
const blank = location => ({
  title: '', venue: (location?.facilityName || '').slice(0, 160),
  address: (location?.address || '').slice(0, 300), details: '', startDate: '', startTime: '', endDate: '', endTime: '',
  lat: location?.lat ?? '', lon: location?.lon ?? '',
});

async function request(url, options) {
  const response = await fetch(url, { cache: 'no-store', credentials: 'include', ...options });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Could not load or save blood drives.');
  return data;
}

export default function ManageBloodDrives() {
  const [data, setData] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const [now, setNow] = useState(Date.now);
  const [status, setStatus] = useState('All');
  const [showMap, setShowMap] = useState(false);
  const map = useRef(null);
  const load = useCallback(async signal => {
    setError('');
    try {
      const result = await request(endpoint, { signal });
      if (!signal?.aborted) setData(result);
    } catch (err) {
      if (!signal?.aborted) setError(err.message);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal);
    const clock = window.setInterval(() => setNow(Date.now()), 30000);
    return () => { controller.abort(); window.clearInterval(clock); };
  }, [load]);

  function edit(drive) {
    setShowMap(false);
    const [startDate, startTime] = manilaIsodate(drive.startsAt).split('T');
    const [endDate, endTime] = manilaIsodate(drive.endsAt).split('T');
    setDraft({ ...drive, startDate, startTime, endDate, endTime });
    setError('');
    setNotice('');
  }

  async function save(event) {
    event.preventDefault();
    setError('');
    const { _id, startDate, startTime, endDate, endTime, ...values } = draft;
    const startsAt = `${startDate}T${startTime}:00+08:00`;
    const endsAt = `${endDate}T${endTime}:00+08:00`;
    if (!(Date.parse(endsAt) > Date.parse(startsAt))) {
      setError('End date and time must be after start date and time.');
      return;
    }
    setSaving(true);
    try {
      await request(_id ? `${endpoint}/${_id}` : endpoint, {
        method: _id ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...values, startsAt, endsAt,
          lat: Number(values.lat), lon: Number(values.lon),
        }),
      });
      setDraft(null);
      setNotice(_id ? 'Drive updated.' : 'Drive published.');
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function chooseVenue(place) {
    setDraft(current => ({
      ...current, venue: place.name.slice(0, 160), address: (place.address || current.address).slice(0, 300),
      lat: place.lat, lon: place.lon,
    }));
    map.current?.flyTo({ center: [place.lon, place.lat], zoom: 15 });
  }

  const coordinates = draft && draft.lat !== '' && draft.lon !== '' &&
    Math.abs(Number(draft.lat)) <= 90 && Math.abs(Number(draft.lon)) <= 180
    ? { latitude: Number(draft.lat), longitude: Number(draft.lon) }
    : null;
  const visibleDrives = data?.drives.filter(drive => {
    const current = driveStatus(drive, now);
    return status === 'All' || current === status || (status === 'Active' && current !== 'Past');
  });

  return (
    <section className="content-card drive-management">
      <div className="drive-heading">
        <div><h2>Blood drives</h2><p>Publish and manage drives for your facility.</p></div>
        <div className="drive-actions">
          <button type="button" disabled={saving} onClick={() => load()}>Refresh</button>
          <button type="button" disabled={!data || saving} onClick={() => {
            setDraft(blank(data.location)); setShowMap(false); setNotice(''); setError('');
          }}>Post a drive</button>
        </div>
      </div>
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      {draft && <form className="drive-form" onSubmit={save}>
        <h3>{draft._id ? 'Edit drive' : 'New drive'}</h3>
        <p className="drive-host">
        Hosting facility <strong>{data.location.facilityName}</strong>
        </p>
        {fields.map(([key, label, maxLength]) => {
          const coordinate = key === 'lat' || key === 'lon';
          return <label key={key}>{label}<input required maxLength={maxLength}
            type={coordinate ? 'number' : key.endsWith('Date') ? 'date' : key.endsWith('Time') ? 'time' : 'text'}
            min={key === 'endDate' ? draft.startDate || undefined :
              key === 'endTime' && draft.endDate === draft.startDate ? draft.startTime || undefined :
              coordinate ? (key === 'lat' ? -90 : -180) : undefined}
            max={coordinate ? (key === 'lat' ? 90 : 180) : undefined}
            step={coordinate ? 'any' : undefined} value={draft[key]}
            onChange={event => setDraft(current => ({ ...current, [key]: event.target.value }))} /></label>;
        })}
        <div className="drive-location">
          <div className="drive-actions"><button type="button" aria-expanded={showMap}
            onClick={() => setShowMap(current => !current)}>{showMap ? 'Hide map' : 'Choose venue on map'}</button></div>
          {showMap && <>
            <DrivePlaceSearch onSelect={chooseVenue} />
            <p>Click the map to place the pin. Confirm that the venue name and address match the pin.</p>
            <Map ref={map} initialViewState={{ latitude: 14.5888, longitude: 120.9744, ...coordinates, zoom: 12 }}
              mapStyle="https://basemaps.cartocdn.com/gl/positron-gl-style/style.json"
              style={{ height: 270, width: '100%' }} cursor="crosshair" scrollZoom={false}
              onClick={({ lngLat }) => setDraft(current => ({ ...current, lat: lngLat.lat, lon: lngLat.lng }))}>
              <NavigationControl position="top-right" />
              {coordinates && <Marker {...coordinates} color="#8f1d2c" />}
            </Map>
          </>}
        </div>
        <label>Additional details<textarea maxLength={1500} rows={3} value={draft.details}
          onChange={event => setDraft(current => ({ ...current, details: event.target.value }))} /></label>
        <div className="drive-actions"><button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save drive'}</button>
          <button type="button" disabled={saving} onClick={() => setDraft(null)}>Cancel</button></div>
      </form>}
      {!data && !error && <p>Loading blood drives…</p>}
      {data && <div className="drive-controls"><DriveStatusFilter status={status} onChange={setStatus} /></div>}
      {data && !visibleDrives.length && <p>No drives match this status.</p>}
      <div className="drive-grid">{visibleDrives?.map(drive => <DriveCard key={drive._id} drive={drive.hostName ? drive : { ...drive, hostName: data.location.facilityName }} onEdit={edit} now={now} />)}</div>
    </section>
  );
}
