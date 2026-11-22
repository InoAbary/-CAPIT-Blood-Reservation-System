import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import DonorSidebar from '../components/DonorSidebar';
import DrivePlaceSearch from '../components/DrivePlaceSearch';
import '../styles/Dashboard.css';
import '../styles/UI.css';
import '../styles/BloodDrives.css';

const date = new Intl.DateTimeFormat('en-PH', { dateStyle: 'medium', timeZone: 'Asia/Manila' });
const time = new Intl.DateTimeFormat('en-PH', { timeStyle: 'short', timeZone: 'Asia/Manila' });
const statuses = ['Upcoming', 'Ongoing', 'Past', 'All'];

export function driveStatus(drive, now) {
  return Date.parse(drive.endsAt) <= now ? 'Past' :
    Date.parse(drive.startsAt) <= now ? 'Ongoing' : 'Upcoming';
}

export function DriveStatusFilter({ status, onChange }) {
  return <label>Status <select value={status} onChange={event => onChange(event.target.value)}>
    <option value="Active">Upcoming and ongoing</option>
    {statuses.map(option => <option key={option}>{option}</option>)}
  </select></label>;
}

function kmBetween(from, drive) {
  const radians = value => value * Math.PI / 180;
  const a = Math.sin(radians(drive.lat - from.latitude) / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(drive.lat)) *
    Math.sin(radians(drive.lon - from.longitude) / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
}

export function DriveCard({ drive, distance, onEdit, now = Date.now() }) {
  const status = driveStatus(drive, now);
  const dialog = useRef(null);
  const titleId = useId();
  const starts = new Date(drive.startsAt);
  const ends = new Date(drive.endsAt);
  const map = 'https://www.google.com/maps/search/?api=1&query=' +
    encodeURIComponent(`${drive.lat},${drive.lon}`);
  return (
    <article className="drive-card">
      <span className="drive-status" data-status={status}>{status}</span>
      <div className="drive-card-identity">
        <h3>{drive.title}</h3>
        <p>{drive.hostName || 'Hosting facility unavailable'}</p>
      </div>
      <dl>
        <div><dt>Starts</dt><dd>{date.format(starts)} · {time.format(starts)}</dd></div>
        <div><dt>Ends</dt><dd>{date.format(ends)} · {time.format(ends)}</dd></div>
      </dl>
      <div className="drive-actions">
        <button type="button" onClick={() => dialog.current.showModal()} aria-label={`View details for ${drive.title}`}>View details</button>
        {onEdit && status !== 'Past' && <button type="button" onClick={() => onEdit(drive)}>Edit drive</button>}
      </div>
      <dialog className="drive-details" ref={dialog} aria-labelledby={titleId}>
        <header className="drive-heading">
          <h2 id={titleId}>{drive.title}</h2>
          <button type="button" className="drive-close" onClick={() => dialog.current.close()}>Close</button>
        </header>
        <dl>
          <div><dt>Host</dt><dd>{drive.hostName || 'Hosting facility unavailable'}</dd></div>
          <div><dt>Status</dt><dd>{status}</dd></div>
          <div><dt>Starts</dt><dd>{date.format(starts)} · {time.format(starts)}</dd></div>
          <div><dt>Ends</dt><dd>{date.format(ends)} · {time.format(ends)}</dd></div>
          <div><dt>Venue</dt><dd>{drive.venue}</dd></div>
          <div><dt>Address</dt><dd>{drive.address}</dd></div>
        </dl>
        {Number.isFinite(distance) && <p>{distance.toFixed(1)} km away</p>}
        {drive.details && <p className="drive-description">{drive.details}</p>}
        <div className="drive-actions"><a href={map} target="_blank" rel="noopener noreferrer">Open in Google Maps</a></div>
      </dialog>
    </article>
  );
}

export default function BloodDrives({ embedded = false }) {
  const { donor, logoutDonor } = useAuth();
  const navigate = useNavigate();
  const role = localStorage.getItem('donorHubRole') === 'recipient' ? 'recipient' : 'donor';
  const [drives, setDrives] = useState(null);
  const [now, setNow] = useState(Date.now);
  const [location, setLocation] = useState(null);
  const [nearby, setNearby] = useState(false);
  const [range, setRange] = useState('25');
  const [order, setOrder] = useState('soonest');
  const [status, setStatus] = useState('Active');
  const includePast = status === 'Past' || status === 'All';
  const [error, setError] = useState('');
  const locationDialog = useRef(null);
  const inDonorHub = !embedded && donor && role === 'donor';
  const [query, setQuery] = useState('');
  const search = query.trim().toLowerCase();

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setNow(Date.now());
      try {
        const response = await fetch('/api/blood-drives' + (includePast ? '?includePast=1' : ''),
          { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error();
        const data = await response.json();
        if (!controller.signal.aborted) {
          setDrives(data.drives);
          setError('');
        }
      } catch {
        if (!controller.signal.aborted) setError('Could not load blood drives.');
      }
    }
    load();
    const refresh = window.setInterval(load, 30000);
    return () => {
      controller.abort();
      window.clearInterval(refresh);
    };
  }, [includePast]);

  function chooseLocation(place) {
    setLocation({ latitude: place.lat, longitude: place.lon, name: place.name });
    setNearby(true);
    locationDialog.current.close();
  }

  function clearLocation() {
    setLocation(null);
    setNearby(false);
    if (order === 'closest' || order === 'farthest') setOrder('soonest');
  }

  const active = (drives || []).filter(drive => {
    if (search && ![drive.title, drive.hostName, drive.venue, drive.address]
      .some(value => value?.toLowerCase().includes(search))) return false;
    const current = driveStatus(drive, now);
    return status === 'All' || current === status || (status === 'Active' && current !== 'Past');
  })
    .map(drive => ({ drive, distance: location ? kmBetween(location, drive) : null }))
    .filter(({ distance }) => !nearby || distance <= Number(range))
    .sort((a, b) => {
      if (order === 'closest') return a.distance - b.distance;
      if (order === 'farthest') return b.distance - a.distance;
      const time = Date.parse(a.drive.startsAt) - Date.parse(b.drive.startsAt);
      return order === 'latest' ? -time : time;
    });

  const content = (
    <>
      <header className="ui-page-header ui-page-header--card">
        <div className="ui-page-header-copy">
          <h1>Blood Drives</h1>
          <p>Browse donation drives and check venue details.</p>
        </div>
        {!embedded && !inDonorHub && <Link className="ui-page-header-action" to="/">Home</Link>}
      </header>
      <div className="drive-controls">
        <label>Search drives <input type="search" value={query} placeholder="Drive, facility, or venue"
          onChange={event => setQuery(event.target.value)} /></label>
        <DriveStatusFilter status={status} onChange={setStatus} />
        <button type="button" onClick={() => locationDialog.current.showModal()}>
          {location ? 'Change location' : 'Choose location'}
        </button>
        {location && <><span>{location.name}</span><button type="button" onClick={clearLocation}>Clear location</button></>}
        <label>Sort by <select value={order} onChange={event => setOrder(event.target.value)}>
          <option value="soonest">Soonest first</option><option value="latest">Latest first</option>
          <option value="closest" disabled={!location}>Closest first</option>
          <option value="farthest" disabled={!location}>Farthest first</option>
        </select></label>
        <label><input type="checkbox" disabled={!location} checked={nearby} onChange={event => setNearby(event.target.checked)} /> Nearby only</label>
        {nearby && <label>Range (km) <input type="number" min="1" value={range}
          onChange={event => setRange(event.target.value)} onBlur={() => setRange(value => String(Math.max(1, Number(value) || 1)))} /></label>}
      </div>
      <dialog className="drive-details" ref={locationDialog} aria-labelledby="drive-location-title">
        <header className="drive-heading">
          <h2 id="drive-location-title">Choose a location</h2>
          <button type="button" className="drive-close" onClick={() => locationDialog.current.close()}>Close</button>
        </header>
        <DrivePlaceSearch onSelect={chooseLocation} />
      </dialog>
      {error && <p className="drive-feedback" role="alert">{error}</p>}
      {drives === null && !error && <p className="drive-feedback" role="status">Loading blood drives…</p>}
      {drives && !active.length && !error && <p className="drive-feedback" role="status">
        {search ? `No blood drives match “${query.trim()}”.` :
          drives.length ? 'No blood drives match these filters.' : 'No blood drives are available in this view.'}
      </p>}
      <div className="drive-grid">
        {active.map(({ drive, distance }) => <DriveCard key={drive._id} drive={drive} distance={distance} now={now} />)}
      </div>
    </>
  );

  if (embedded) return <section className="drive-landing ui-dashboard">{content}</section>;

  if (!inDonorHub) {
    return <div className="drive-public ui-dashboard"><main className="drive-page">{content}</main></div>;
  }

  return (
    <div className="dashboard-container donor-theme ui-dashboard drive-hub">
      <DonorSidebar
        role={role}
        firstName={donor.firstName}
        acknowledgeDriveUpdates={drives !== null}
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
        <div className="content-placeholder">{content}</div>
      </main>
    </div>
  );
}
