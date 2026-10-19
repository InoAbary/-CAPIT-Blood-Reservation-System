import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom'
function Login(){


    const [accData, setAccData] = useState({
        email: '',
        password: ''
    })

    const navigate = useNavigate()

    const [submitting, setSubmitting] = useState(false)
    const handleFormSubmission = async(e) => {
        e.preventDefault()

        if (!accData.email){
            alert('Enter a valid email.')
            return
        }

        if (!accData.password){
            alert('Enter a password.')
            return
        }

        setSubmitting(true);

        try{

            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(accData)
            })

            const body = await res.json()
            if (!res.ok) throw new Error(body.error || 'Invalid login.')
            
            navigate('/Login/Success', {
                state: { email: body.acc.email, firstName: body.acc.firstName },
                replace: true,
            })
        } catch(err) {
            console.error(err)
            alert(err.message)
        } finally {
            setSubmitting(false)
        }
        

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