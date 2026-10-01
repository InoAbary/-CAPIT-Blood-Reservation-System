import React, { useState, useEffect, useRef } from 'react';


function Utilization() {

    const [bloodInventory, setBloodInventory] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        loadBloodInventory();
    }, [])

    const loadBloodInventory = async () => {
        setIsLoading(true);
        try{
            const resp = await fetch ('/api/inventories')

            if (resp.ok) {
                const data = await resp.json();
                if (data.success) {
                    setBloodInventory(data.inventories);
                } else {
                    setError(data.message || 'Failed to load data');
                }
            } else {
                setError('Server responded with an error');
            } 

        } catch (error) {
            console.error('Error loading blood inventory:', error);
            setError('Network error occurred');
        } finally {
            setIsLoading(false);
        }
    
    };

    if (isLoading) return <div>Loading blood inventory...</div>;
    if (error) return <div>Error: {error}</div>;

    return (

        <div className="utilization-container">
            <h2>Available Blood Supplies</h2>
            
            {bloodInventory.length === 0 ? (
                <p>No blood supplies currently in inventory.</p>
            ) : (
                <table className="inventory-table">
                    <thead>
                        <tr>
                            <th>Inventory ID</th>
                            <th>Facility ID</th>
                            <th>Blood Type</th>
                            <th>Component</th>
                            <th>Quantity</th>
                            <th>Status</th>
                            <th>Last Updated</th>
                        </tr>
                    </thead>
                    <tbody>
                        {bloodInventory.map((item) => (
                            <tr key={item._id?.$oid || item.inventoryID}>
                                <td>{item.inventoryID}</td>
                                <td>{item.facilityID}</td>
                                <td><strong>{item.bloodType}</strong></td>
                                <td>{item.component}</td>
                                <td>{item.availQuantity}</td>
                                <td>
                                    <span className={`status-badge ${item.availStatus?.toLowerCase()}`}>
                                        {item.availStatus}
                                    </span>
                                </td>
                                <td>
                                    {item.lastUpdated?.$date 
                                        ? new Date(item.lastUpdated.$date).toLocaleDateString() 
                                        : 'N/A'}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            )}
        </div>
    )

}

export default Utilization;