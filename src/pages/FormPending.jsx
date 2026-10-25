import React, { useState, useEffect, useRef } from 'react';
import '../styles/FormResult.css';
function FormPending() {

    return (
        <div className="formresult-container formresult-pending">
            <h3>Your blood donation request form has been submitted. Please visit your nearest Philippine Red Cross branch for further screening procedures.</h3>
        </div>
    )
}

export default FormPending;