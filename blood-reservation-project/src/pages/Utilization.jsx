import React, { useState } from 'react';

import BSFUtilization
    from '../components/utilization/BSFUtilization';

import HospitalUtilization
    from '../components/utilization/HospitalUtilization';

import './Utilization.css';


function Utilization() {

    /*
     * TODO:
     * Replace this temporary role switch with the
     * authenticated user's real role.
     */
    const [viewRole, setViewRole] =
        useState('hospital');


    return (
        <div className="utilization-container">

            {/* TODO:
                Remove this preview switch once authentication
                automatically determines the user's role.
            */}
            <div className="util-role-switch">

                <button
                    type="button"
                    className={
                        viewRole === 'hospital'
                            ? 'util-role-button active'
                            : 'util-role-button'
                    }
                    onClick={() =>
                        setViewRole('hospital')
                    }
                >
                    Hospital View
                </button>


                <button
                    type="button"
                    className={
                        viewRole === 'bsf'
                            ? 'util-role-button active'
                            : 'util-role-button'
                    }
                    onClick={() =>
                        setViewRole('bsf')
                    }
                >
                    BSF View
                </button>

            </div>


            {viewRole === 'hospital' ? (
                <HospitalUtilization />
            ) : (
                <BSFUtilization />
            )}

        </div>
    );
}


export default Utilization;