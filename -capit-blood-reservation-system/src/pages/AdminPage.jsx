import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import AdminAddBranchModal from '../components/AdminAddBranchModal';
import { PinIcon, RefreshIcon, CheckIcon, PhoneIcon, ClockIcon } from '../components/Icons';
import './AdminPage.css';

export default function AdminPage() {
  const [facilities, setFacilities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const fetchFacilities = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/facilities');
      const data = await res.json();
      if (data.success && Array.isArray(data.facilities)) {
        setFacilities(data.facilities);
      }
    } catch (e) {
      console.warn('Error fetching facilities for admin:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFacilities();
  }, []);

  const handleBranchAdded = (newFacility) => {
    setFacilities((prev) => [newFacility, ...prev]);
    setToastMessage(`Branch "${newFacility.facilityName || newFacility.name}" logged to database.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  return (
    <div className="admin-page-container">
      {/* Top Banner */}
      <div className="admin-page-header">
        <div className="admin-page-header-inner">
          <div>
            <div className="admin-page-eyebrow">
              <span className="pulse-dot"></span>
              <span>SANDUGO ADMIN OPERATIONS</span>
              <span className="dot-separator">•</span>
              <span>MONGODB &amp; GIT REPOSITORY</span>
            </div>
            <h1 className="admin-page-title">Facility &amp; Branch Administration</h1>
            <p className="admin-page-desc">
              Manage nationwide Philippine Red Cross chapters and hospital Blood Service Facilities logged into MongoDB and git records.
            </p>
          </div>

          <div className="admin-header-actions">
            <button
              type="button"
              className="btn-admin-add-main"
              onClick={() => setShowAddModal(true)}
            >
              <PinIcon size={16} />
              <span>+ Add Branch (Google Maps)</span>
            </button>
            <NavLink to="/BloodBankMap" className="btn-admin-return">
              Return to Locator &gt;
            </NavLink>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="admin-page-content">
        <div className="admin-stats-row">
          <div className="admin-stat-card">
            <span className="stat-label">Total Facilities Logged</span>
            <span className="stat-value red">{facilities.length} Branches</span>
          </div>
          <div className="admin-stat-card">
            <span className="stat-label">PRC Chapters</span>
            <span className="stat-value">
              {facilities.filter((f) => f.category === 'PRC' || f.facilityName?.includes('Red Cross')).length} Chapters
            </span>
          </div>
          <div className="admin-stat-card">
            <span className="stat-label">Hospital BSFs</span>
            <span className="stat-value blue">
              {facilities.filter((f) => f.category !== 'PRC' && !f.facilityName?.includes('Red Cross')).length} Facilities
            </span>
          </div>
          <div className="admin-stat-card">
            <span className="stat-label">Database Status</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
              <span className="status-online-dot"></span>
              <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#16a34a' }}>
                Active (MongoDB / Git)
              </span>
            </div>
          </div>
        </div>

        {/* Facilities Table */}
        <div className="admin-table-container">
          <div className="table-header-bar">
            <h3 className="table-title">Registered Blood Service Facilities</h3>
            <button
              type="button"
              className="btn-refresh-table"
              onClick={fetchFacilities}
              title="Refresh from MongoDB"
            >
              <RefreshIcon size={14} spinning={loading} />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="table-loading">
              <RefreshIcon size={24} spinning={true} />
              <span>Loading facilities from database...</span>
            </div>
          ) : (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Facility ID</th>
                  <th>Branch Name</th>
                  <th>Category</th>
                  <th>Address</th>
                  <th>Contact</th>
                  <th>Hours</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {facilities.map((fac, idx) => (
                  <tr key={fac.facilityID || fac._id?.$oid || idx}>
                    <td className="cell-id">
                      <code>{fac.facilityID || `F0000${idx + 1}`}</code>
                    </td>
                    <td className="cell-name">
                      <strong>{fac.facilityName || fac.name}</strong>
                      <span className="cell-sub">{fac.typeLabel || fac.facilityType}</span>
                    </td>
                    <td>
                      <span className={`cat-badge ${fac.category === 'PRC' ? 'prc' : 'bsf'}`}>
                        {fac.category || 'Hospital BSF'}
                      </span>
                    </td>
                    <td className="cell-address">{fac.address}</td>
                    <td className="cell-phone">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <PhoneIcon size={12} />
                        <span>{fac.contactNumber || fac.contactNuber || fac.phone}</span>
                      </div>
                    </td>
                    <td className="cell-hours">
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <ClockIcon size={12} />
                        <span>{fac.hours || '8:00 AM - 5:00 PM'}</span>
                      </div>
                    </td>
                    <td>
                      <span className="badge-active">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Add Branch Modal */}
      {showAddModal && (
        <AdminAddBranchModal
          onClose={() => setShowAddModal(false)}
          onBranchAdded={handleBranchAdded}
        />
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="bbis-toast">
          <CheckIcon size={16} />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
