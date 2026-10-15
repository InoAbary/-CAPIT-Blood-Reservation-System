import React, { useState, useEffect, useRef } from 'react';

function Login(){


    const [accData, setAccData] = useState({
        email: '',
        password: ''
    })

    const [submitting, setSubmitting] = useState(false)
    const handleFormSubmission = async(e) => {
        e.preventDefault()

        if (!email){
            alert('Enter a valid email.')
            return
        }

        if (!password){
            alert('Enter a password.')
            return
        }

        setSubmitting(true);
        

    }

    const bind = (field) => ({
        value: accData[field],
        onChange: (e) => setAccData({ ...accData, [field]: e.target.value })
    });

    return(
        <div className="login-page">

            <form onSubmit={handleFormSubmission} className="login-form">
                <div className="login-fieldgroup">
                    <label>
                        Email: 
                        <input type="email" required {...bind('email')} />
                    </label>
                </div>
                <div className="login-fieldgroup">
                    <label>
                        Password: 
                        <input type="password" required {...bind('password')} />
                    </label>
                </div>

                <div className="login-actions">
                    <button
                        type="submit"
                        className="login-submit-btn"
                        disabled={submitting}
                    >
                        {submitting && <span className="btn-spinner" aria-hidden="true" />}
                        {submitting ? 'Logging in...' : 'Login'}
                    </button>
                </div>
            </form>

        </div>
    )
}

export default Login;