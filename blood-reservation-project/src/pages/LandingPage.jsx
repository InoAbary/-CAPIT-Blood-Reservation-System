import React, { useRef, useState } from 'react';
import { Outlet, useMatch, useNavigate } from 'react-router-dom';
import BloodBankMap from './BloodBankMap';
import donationHeart from '../assets/donation-heart-illustration.png';
import {
  SearchIcon,
  ShieldAlertIcon,
  PinIcon,
} from '../components/Icons';
import '../styles/LandingPage.css';

const TABS = [
  { id: 'login',    label: 'Login',           icon: null,                  path: '/Login' },
  { id: 'register', label: 'Register',        icon: null,                  path: '/Register' },
  { id: 'map',      label: 'Blood Bank Map',  icon: <PinIcon size={14} /> },
  { id: 'drives',   label: 'Blood Drives',     icon: <PinIcon size={14} />, path: '/blood-drives' },
  { id: 'about',    label: 'About Us',        icon: null },
];

const ELIGIBILITY = [
  { title: 'Age', detail: '18 – 65 years old' },
  { title: 'Weight', detail: 'At least 50 kg' },
  { title: 'Hemoglobin', detail: 'At least 125 g/L (F) / 135 g/L (M)' },
  { title: 'Interval', detail: 'Every 3 months (whole blood)' },
];

const STEPS = [
  {
    n: '01',
    title: 'Register & Screen',
    text: 'Create a donor account and complete the online health questionnaire.',
  },
  {
    n: '02',
    title: 'Book an Appointment',
    text: 'Choose a nearby PRC chapter or participating hospital BSF and pick a slot.',
  },
  {
    n: '03',
    title: 'Donate',
    text: 'A single donation can save up to three lives. The process takes ~10 minutes.',
  },
  {
    n: '04',
    title: 'Track & Return',
    text: 'Monitor your donation history and cooldown, then donate again safely.',
  },
];

const FAQS = [
  {
    q: 'Does donating blood hurt?',
    a: 'You may feel a brief pinch when the needle is inserted. The donation itself is painless and typically takes 8–10 minutes.',
  },
  {
    q: 'How often can I donate?',
    a: 'Whole blood every 3 months, platelets every 2 weeks (up to 24 times/year), and plasma every 4 weeks.',
  },
  {
    q: 'How is my blood type determined?',
    a: 'Your blood type (A, B, AB, O with Rh factor +/-) is tested during your first donation and recorded in your donor profile.',
  },
  {
    q: 'Is my data private?',
    a: 'Yes. The Blood Bank Map shows only simplified availability statuses (Available, Low, Unavailable) — never individual donor data.',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const [infoTab, setInfoTab] = useState('about');
  const loginMatch = useMatch('/Login');
  const registerMatch = useMatch('/Register');
  const panelRef = useRef(null);
  const drivesMatch = useMatch('/blood-drives');
  const authTab = loginMatch ? 'login' : registerMatch ? 'register' : null;
  const activeTab = authTab || (drivesMatch ? 'drives' : infoTab);

  function selectInfoTab(tab) {
    setInfoTab(tab);
    if (authTab || drivesMatch) navigate('/');
  }

  return (
    <div className="landing-page">
      <header className="landing-header">
        <div className="landing-header-inner">
          <div className="landing-tabs-bar landing-tabs-bar-header" role="tablist">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`landing-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
                onClick={() => {
                  if (tab.path) {
                    if (activeTab !== tab.id) navigate(tab.path);
                  } else {
                    selectInfoTab(tab.id);
                  }
                }}
              >
                {tab.icon && <span className="landing-tab-icon">{tab.icon}</span>}
                {tab.label}
              </button>
            ))}
          </div>

          <div className="landing-brand-row">
            <span className="landing-brand">SANDUGO</span>
            <span className="landing-brand-dot">•</span>
            <span className="landing-brand-sub">BLOOD DONATION NETWORK</span>
          </div>
        </div>
      </header>

      {activeTab === 'about' && (
        <section className="landing-hero">
          <div className="landing-hero-inner">
            <div className="landing-hero-layout">
              <div className="landing-hero-copy">
                <h1 className="landing-headline">
                  Every drop counts.<br />
                  <span className="landing-headline-accent">Be someone's lifeline.</span>
                </h1>

                <p className="landing-subtext">
                  Sandugo connects voluntary blood donors with verified Philippine Red
                  Cross chapters and hospital Blood Service Facilities. Find available
                  blood near you, book a donation slot, and help keep the national
                  supply steady.
                </p>

                <div className="landing-hero-stats">
                  <div className="landing-stat">
                    <span className="landing-stat-value">1</span>
                    <span className="landing-stat-label">Donation saves up to 3 lives</span>
                  </div>
                  <div className="landing-stat">
                    <span className="landing-stat-value">~10</span>
                    <span className="landing-stat-label">Minutes per donation</span>
                  </div>
                  <div className="landing-stat">
                    <span className="landing-stat-value">3 mo.</span>
                    <span className="landing-stat-label">Safe donation interval</span>
                  </div>
                </div>
              </div>

              <figure className="landing-hero-artwork">
                <img
                  src={donationHeart}
                  alt="Red heart and blood drop illustration for blood donation"
                />
                <figcaption>Blood donation saves lives</figcaption>
              </figure>
            </div>
          </div>
        </section>
      )}

      {/* ---------- TABS ---------- */}
      <section className="landing-tabs-section">
        <div className="landing-tabs-container">
          <div className={authTab ? 'landing-tab-panel landing-tab-panel-auth' : 'landing-tab-panel'} ref={panelRef}>
            {(authTab || drivesMatch) && <Outlet />}
            {activeTab === 'map' && (
              <div className="landing-panel landing-panel-map">
                <BloodBankMap />
              </div>
            )}
            {activeTab === 'about' && (
              <section className="landing-about-panel" aria-labelledby="landing-about-title">
                <div className="landing-about-intro">
                  <span className="landing-about-kicker">ABOUT SANDUGO</span>
                  <h2 id="landing-about-title">Making blood donation easier to find and plan.</h2>
                  <p>
                    Sandugo brings donor registration, appointment booking, and
                    blood service facility discovery together in one place.
                  </p>
                </div>

                <div className="landing-about-values">
                  <article className="landing-about-card">
                    <span className="landing-about-number">01</span>
                    <h3>Find a nearby facility</h3>
                    <p>Explore participating facilities and check simplified blood availability.</p>
                  </article>
                  <article className="landing-about-card">
                    <span className="landing-about-number">02</span>
                    <h3>Plan your donation</h3>
                    <p>Register, complete screening, and book a donation appointment.</p>
                  </article>
                  <article className="landing-about-card">
                    <span className="landing-about-number">03</span>
                    <h3>Give safely</h3>
                    <p>Keep track of your donation history and return when you’re eligible.</p>
                  </article>
                </div>

                <div className="landing-about-footer">
                  <p>Every donation can help support patients and local communities.</p>
                  <button type="button" onClick={() => navigate('/Register')}>
                    Register as a Donor
                  </button>
                </div>
              </section>
            )}
          </div>
        </div>
      </section>

      {/* ---------- EDUCATION: ELIGIBILITY ---------- */}
      <section className="landing-section">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">Am I eligible to donate?</h2>
          <p className="landing-section-lead">
            Most healthy adults can donate. Quick check — you should meet all of
            these:
          </p>
          <div className="landing-eligibility-grid">
            {ELIGIBILITY.map((item) => (
              <div key={item.title} className="landing-eligibility-card">
                <span className="landing-eligibility-title">{item.title}</span>
                <span className="landing-eligibility-detail">{item.detail}</span>
              </div>
            ))}
          </div>
          <p className="landing-section-note">
            <ShieldAlertIcon size={14} /> Additional screening applies for
            travel, medication, and recent illness. Staff will confirm on-site.
          </p>
        </div>
      </section>

      {/* ---------- EDUCATION: PROCESS ---------- */}
      <section className="landing-section landing-section-alt">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">How donation works</h2>
          <div className="landing-steps-grid">
            {STEPS.map((step) => (
              <div key={step.n} className="landing-step-card">
                <span className="landing-step-number">{step.n}</span>
                <h3 className="landing-step-title">{step.title}</h3>
                <p className="landing-step-text">{step.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- EDUCATION: FAQ ---------- */}
      <section className="landing-section">
        <div className="landing-section-inner">
          <h2 className="landing-section-title">Frequently asked questions</h2>
          <div className="landing-faq-list">
            {FAQS.map((faq) => (
              <details key={faq.q} className="landing-faq-item">
                <summary className="landing-faq-q">{faq.q}</summary>
                <p className="landing-faq-a">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- CTA ---------- */}
      <section className="landing-cta">
        <div className="landing-section-inner landing-cta-inner">
          <h2 className="landing-cta-title">Ready to save a life?</h2>
          <p className="landing-cta-text">
            Join the Sandugo donor network — it takes less than 2 minutes to
            register.
          </p>
          <div className="landing-cta-buttons">
            <button
              type="button"
              className="landing-cta-primary"
              onClick={() => {
                if (activeTab !== 'register') navigate('/Register');
                panelRef.current?.scrollIntoView();
              }}
            >
              Register as a Donor
            </button>
            <button
              type="button"
              className="landing-cta-secondary"
              onClick={() => selectInfoTab('map')}
            >
              <SearchIcon size={14} /> Find Blood Near Me
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
