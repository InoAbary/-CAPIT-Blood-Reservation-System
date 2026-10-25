import { useEffect, useState } from 'react';

import HospitalUtilization from './HospitalUtilization';


function Utilization() {

    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');


    useEffect(() => {

        const fetchUser = async () => {
            try {

                const response = await fetch(
                    'http://localhost:3000/api/auth/me/staff',
                    {
                        credentials: 'include'
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        'Failed to load staff account.'
                    );
                }

                setUser(data.user);

            } catch (error) {

                console.error(
                    'Failed to load utilization user:',
                    error
                );

                setError(error.message);

            } finally {
                setLoading(false);
            }
        };


        fetchUser();

    }, []);


    if (loading) {
        return <p>Loading utilization...</p>;
    }


    if (error) {
        return <p>{error}</p>;
    }


    if (user?.role === 'hospital') {
        return <HospitalUtilization />;
    }


    return (
        <div>
            <h1>BSF Utilization</h1>
            <p>BSF utilization page will be added next.</p>
        </div>
    );
}


export default Utilization;