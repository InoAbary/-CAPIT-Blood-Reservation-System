import { useEffect, useState } from 'react';

import HospitalUtilization from './HospitalUtilization';
import BSFUtilization from './BSFUtilization';

function Utilization() {
    const [side, setSide] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const loadAccess = async () => {
            try {
                const response = await fetch(
                    '/api/utilization/access',
                    {
                        credentials: 'include'
                    }
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message ||
                        'Unable to load utilization access.'
                    );
                }

                setSide(data.side);
            } catch (error) {
                console.error(
                    'Failed to load utilization access:',
                    error
                );

                setError(
                    error.message ||
                    'Unable to load utilization.'
                );
            } finally {
                setLoading(false);
            }
        };

        loadAccess();
    }, []);

    if (loading) {
        return (
            <div>
                Loading utilization...
            </div>
        );
    }

    if (error) {
        return (
            <div>
                {error}
            </div>
        );
    }

    if (side === 'hospital') {
        return <HospitalUtilization />;
    }

    if (side === 'bsf') {
        return <BSFUtilization />;
    }

    return (
        <div>
            This account does not have access to utilization.
        </div>
    );
}

export default Utilization;