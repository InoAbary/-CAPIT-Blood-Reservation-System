import React, { useState, useEffect } from 'react';
import './Inventory.css';
import './Utilization.css';

function Inventory() {
  const [inventories, setInventories] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBloodType, setSelectedBloodType] = useState('ALL');
  const [selectedComponent, setSelectedComponent] = useState('ALL');
  const [selectedStatus, setSelectedStatus] = useState('ALL');

  // Modals
  const [reserveModalItem, setReserveModalItem] = useState(null);
  const [reservationForm, setReservationForm] = useState({
    patientName: '',
    hospitalName: '',
    quantity: 1,
    urgency: 'Normal'
  });
  const [showAddModal, setShowAddModal] = useState(false);
  const [addForm, setAddForm] = useState({
    facilityID: 'F00001',
    bloodType: 'O+',
    component: 'Packed RBC',
    availQuantity: 10,
    availStatus: 'Available'
  });
  const [notice, setNotice] = useState(null);

  const loadInventory = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/inventories');
      if (resp.ok) {
        const data = await resp.json();
        if (data.success && Array.isArray(data.inventories)) {
          setInventories(data.inventories);
        } else {
          setError(data.message || 'Failed to load inventory data');
        }
      } else {
        setError('Server responded with an error');
      }
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError('Network error while connecting to server');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleReserveSubmit = (e) => {
    e.preventDefault();
    if (!reserveModalItem) return;

    const requestedUnits = parseInt(reservationForm.quantity, 10) || 1;
    if (requestedUnits > reserveModalItem.availQuantity) {
      alert(`Cannot reserve ${requestedUnits} units. Only ${reserveModalItem.availQuantity} available.`);
      return;
    }

    // Deduct quantity in state
    setInventories((prev) =>
      prev.map((item) => {
        if (item.inventoryID === reserveModalItem.inventoryID) {
          const newQty = item.availQuantity - requestedUnits;
          let newStatus = item.availStatus;
          if (newQty <= 0) newStatus = 'Out of Stock';
          else if (newQty < 3) newStatus = 'Critical';
          else if (newQty < 6) newStatus = 'Limited';
          return {
            ...item,
            availQuantity: newQty,
            availStatus: newStatus,
            lastUpdated: { $date: new Date().toISOString() }
          };
        }
        return item;
      })
    );

    setNotice(
      `Successfully reserved ${requestedUnits} unit(s) of ${reserveModalItem.bloodType} (${reserveModalItem.component}) for ${reservationForm.patientName || 'Patient'} at ${reservationForm.hospitalName || 'Medical Center'}.`
    );
    setReserveModalItem(null);
    setReservationForm({ patientName: '', hospitalName: '', quantity: 1, urgency: 'Normal' });
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const qty = parseInt(addForm.availQuantity, 10) || 0;
    const newId = `I0000${inventories.length + 1}`;
    const newItem = {
      _id: { $oid: `mock-${Date.now()}` },
      inventoryID: newId,
      facilityID: addForm.facilityID,
      bloodType: addForm.bloodType,
      component: addForm.component,
      availQuantity: qty,
      availStatus: qty === 0 ? 'Out of Stock' : addForm.availStatus,
      lastUpdated: { $date: new Date().toISOString() },
      updatedBy: 'U00001'
    };

    setInventories((prev) => [newItem, ...prev]);
    setNotice(`New blood inventory unit #${newId} added successfully.`);
    setShowAddModal(false);
    setAddForm({
      facilityID: 'F00001',
      bloodType: 'O+',
      component: 'Packed RBC',
      availQuantity: 10,
      availStatus: 'Available'
    });
  };

  const filteredInventories = inventories.filter((item) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
      item.inventoryID?.toLowerCase().includes(q) ||
      item.facilityID?.toLowerCase().includes(q) ||
      item.bloodType?.toLowerCase().includes(q) ||
      item.component?.toLowerCase().includes(q);

    const matchesBloodType = selectedBloodType === 'ALL' || item.bloodType === selectedBloodType;
    const matchesComponent = selectedComponent === 'ALL' || item.component === selectedComponent;
    const matchesStatus =
      selectedStatus === 'ALL' ||
      item.availStatus?.toLowerCase() === selectedStatus.toLowerCase();

    return matchesSearch && matchesBloodType && matchesComponent && matchesStatus;
  });

  if (isLoading) return <div className="loading-state">Loading blood inventory...</div>;
  if (error) return <div className="error-state">Error: {error}</div>;

  return (
    <div className="inventory-container">
      {/* Header */}
      <div className="inventory-header">
        <div>
          <h2>Blood Inventory Management</h2>
          <p className="subtitle">Track stock, reserve units for patients, and manage facility supplies</p>
        </div>
        <div className="header-actions">
          <button className="action-btn-secondary" onClick={loadInventory}>
            Refresh
          </button>
          <button className="action-btn-primary" onClick={() => setShowAddModal(true)}>
            Add Blood Stock
          </button>
        </div>
      </div>

      {notice && (
        <div className="notice-banner success">
          <span>{notice}</span>
          <button
            onClick={() => setNotice(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontWeight: 'bold' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="filter-bar">
        <div className="filter-group" style={{ flex: 2 }}>
          <label>Search Inventory</label>
          <input
            type="text"
            className="filter-input"
            placeholder="Search by ID, blood type, facility..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="filter-group">
          <label>Blood Type</label>
          <select
            className="filter-select"
            value={selectedBloodType}
            onChange={(e) => setSelectedBloodType(e.target.value)}
          >
            <option value="ALL">All Blood Types</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => (
              <option key={bt} value={bt}>
                {bt}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Component</label>
          <select
            className="filter-select"
            value={selectedComponent}
            onChange={(e) => setSelectedComponent(e.target.value)}
          >
            <option value="ALL">All Components</option>
            {['Packed RBC', 'Whole Blood', 'Plasma', 'Platelets', 'Cryoprecipitate'].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Availability</label>
          <select
            className="filter-select"
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
          >
            <option value="ALL">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Limited">Limited</option>
            <option value="Critical">Critical</option>
            <option value="Out of Stock">Out of Stock</option>
          </select>
        </div>
      </div>

      {/* Inventory Table */}
      {filteredInventories.length === 0 ? (
        <p className="empty-state">No blood supplies match your search filters.</p>
      ) : (
        <div className="table-wrapper">
          <table className="inventory-table">
            <thead>
              <tr>
                <th>Inventory ID</th>
                <th>Facility ID</th>
                <th>Blood Type</th>
                <th>Component</th>
                <th>In Stock</th>
                <th>Status</th>
                <th>Last Updated</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventories.map((item) => (
                <tr key={item._id?.$oid || item.inventoryID}>
                  <td style={{ fontWeight: 600 }}>{item.inventoryID}</td>
                  <td>{item.facilityID}</td>
                  <td>
                    <span className="blood-type-badge">{item.bloodType}</span>
                  </td>
                  <td>{item.component}</td>
                  <td style={{ fontWeight: 600 }}>{item.availQuantity} units</td>
                  <td>
                    <span
                      className={`status-badge ${
                        item.availStatus?.toLowerCase() === 'available'
                          ? 'available'
                          : item.availStatus?.toLowerCase() === 'limited'
                          ? 'low'
                          : item.availStatus?.toLowerCase() === 'critical'
                          ? 'critical'
                          : 'expired'
                      }`}
                    >
                      {item.availStatus}
                    </span>
                  </td>
                  <td>
                    {item.lastUpdated?.$date
                      ? new Date(item.lastUpdated.$date).toLocaleDateString()
                      : 'N/A'}
                  </td>
                  <td>
                    <button
                      className="reserve-btn"
                      disabled={item.availQuantity <= 0}
                      onClick={() => {
                        setReserveModalItem(item);
                        setReservationForm({
                          patientName: '',
                          hospitalName: '',
                          quantity: 1,
                          urgency: 'Normal'
                        });
                      }}
                    >
                      {item.availQuantity <= 0 ? 'Unavailable' : '🩸 Reserve'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Reserve Blood Modal */}
      {reserveModalItem && (
        <div className="modal-overlay" onClick={() => setReserveModalItem(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reserve Blood Unit</h3>
              <button className="modal-close" onClick={() => setReserveModalItem(null)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleReserveSubmit}>
              <div className="modal-body">
                <div style={{ marginBottom: '1rem', background: '#f8fafc', padding: '0.75rem', borderRadius: 8 }}>
                  <strong>Selected Unit:</strong> #{reserveModalItem.inventoryID} ({reserveModalItem.bloodType} -{' '}
                  {reserveModalItem.component})
                  <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: '0.25rem' }}>
                    Available in stock: <strong>{reserveModalItem.availQuantity} units</strong>
                  </div>
                </div>

                <div className="form-group">
                  <label>Patient / Recipient Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maria Santos"
                    value={reservationForm.patientName}
                    onChange={(e) =>
                      setReservationForm((prev) => ({ ...prev, patientName: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Hospital / Clinic Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Philippine General Hospital"
                    value={reservationForm.hospitalName}
                    onChange={(e) =>
                      setReservationForm((prev) => ({ ...prev, hospitalName: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Units Requested</label>
                  <input
                    type="number"
                    min="1"
                    max={reserveModalItem.availQuantity}
                    required
                    value={reservationForm.quantity}
                    onChange={(e) =>
                      setReservationForm((prev) => ({ ...prev, quantity: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Urgency Level</label>
                  <select
                    value={reservationForm.urgency}
                    onChange={(e) =>
                      setReservationForm((prev) => ({ ...prev, urgency: e.target.value }))
                    }
                  >
                    <option value="Normal">Normal (Scheduled Procedure)</option>
                    <option value="Urgent">Urgent (Within 12 Hours)</option>
                    <option value="Emergency">Emergency (Immediate Transfusion)</option>
                  </select>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="action-btn-secondary"
                    onClick={() => setReserveModalItem(null)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="action-btn-primary">
                    Confirm Reservation
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add New Stock Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Add New Blood Stock</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                ✕
              </button>
            </div>
            <form onSubmit={handleAddSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Facility ID</label>
                  <input
                    type="text"
                    required
                    value={addForm.facilityID}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, facilityID: e.target.value }))}
                  />
                </div>

                <div className="form-group">
                  <label>Blood Type</label>
                  <select
                    value={addForm.bloodType}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, bloodType: e.target.value }))}
                  >
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Component</label>
                  <select
                    value={addForm.component}
                    onChange={(e) => setAddForm((prev) => ({ ...prev, component: e.target.value }))}
                  >
                    {['Packed RBC', 'Whole Blood', 'Plasma', 'Platelets', 'Cryoprecipitate'].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Available Quantity (units)</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={addForm.availQuantity}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, availQuantity: e.target.value }))
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Availability Status</label>
                  <select
                    value={addForm.availStatus}
                    onChange={(e) =>
                      setAddForm((prev) => ({ ...prev, availStatus: e.target.value }))
                    }
                  >
                    <option value="Available">Available</option>
                    <option value="Limited">Limited</option>
                    <option value="Critical">Critical</option>
                    <option value="Out of Stock">Out of Stock</option>
                  </select>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    className="action-btn-secondary"
                    onClick={() => setShowAddModal(false)}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="action-btn-primary">
                    Save Blood Stock
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Inventory;
