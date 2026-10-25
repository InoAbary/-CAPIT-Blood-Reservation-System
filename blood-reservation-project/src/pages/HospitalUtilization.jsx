import { useEffect, useState } from 'react';

function HospitalUtilization() {

    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');


    useEffect(() => {

        const fetchRequests = async () => {
            try {

                const response = await fetch(
                    'http://localhost:3000/api/utilization/hospital/requests',
                    {
                        credentials: 'include'
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        'Failed to load blood requests.'
                    );
                }

                setRequests(data.requests || []);

            } catch (error) {

                console.error(
                    'Failed to load hospital utilization requests:',
                    error
                );

                setError(error.message);

            } finally {
                setLoading(false);
            }
        };


        fetchRequests();

    }, []);


    if (loading) {
        return <p>Loading requests...</p>;
    }


    if (error) {
        return <p>{error}</p>;
    }


    return (
        <div>
            <h1>Hospital Utilization</h1>

            <p>
                Requests found: {requests.length}
            </p>

            {requests.map((request) => (
                <div key={request._id}>
                    <p>
                        {request.bloodType} - {request.component}
                    </p>

                    <p>
                        Units: {request.units}
                    </p>

                    <p>
                        Status: {request.requestStatus}
                    </p>

                    <hr />
                </div>
            ))}
        </div>
    );
}


export default HospitalUtilization;