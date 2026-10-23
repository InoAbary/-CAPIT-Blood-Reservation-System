import React, { useState, useEffect, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom'
import '../styles/Register.css'

function RegisterStaff(){

    const {t, i18n} = useTranslation();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false)
    const [staffData, setStaffData] = useState({
        lastName: '',
        firstName: '',
        email: '',
        password:'',
        confirmPassword:''
    })

    const handleFormSubmission = async(e) => {
        e.preventDefault()

        if (staffData.password !== staffData.confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        setSubmitting(true)

        try{

            const res = await fetch('/api/auth/register/staff', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(staffData)
            })

            const body = await res.json()
            if (!res.ok) throw new Error(body.error || 'Registration failed.')
            
            navigate('/Register/Success', {
                state: { email: staffData.email },
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
        value: staffData[field],
        onChange: (e) => setStaffData({ ...staffData, [field]: e.target.value })
    });

    return (
        <div className="register-page">
            <button onClick={() => i18n.changeLanguage('en')}>English</button>
            <button onClick={() => i18n.changeLanguage('fil')}>Filipino</button>

            <form onSubmit={handleFormSubmission} className="register-form">

                {/* --- Name --- */}
                <div className="register-fieldgroup">
                    <label>{t('staffData.lastName', 'Surname')}
                        <input type="text" required {...bind('lastName')} />
                    </label>
                    <label>{t('staffData.firstName', 'First Name')}
                        <input type="text" required {...bind('firstName')} />
                    </label>
                </div>

                

                {/* --- Contact --- */}
                <div className="register-fieldgroup">
                    <label>Telephone Number
                        <input type="text" {...bind('telephoneNumber')} />
                    </label>
                    <label>Mobile Number
                        <input type="text" {...bind('mobileNumber')} />
                    </label>
                    <label>E-mail Address
                        <input type="email" required {...bind('email')} />
                    </label>
                </div>

            

                <div className="register-fieldgroup">
                    <div className="password-pair">
                        <label>Password
                            <input type="password" {...bind('password')} />
                        </label>
                        <label>Confirm Password
                            <input type="password" {...bind('confirmPassword')} />
                        </label>
                    </div>
                </div>

                

                <div className="register-actions">
                    <button
                        type="submit"
                        className="register-submit-btn"
                        disabled={submitting}
                    >
                        {submitting && <span className="btn-spinner" aria-hidden="true" />}
                        {submitting ? 'Signing up...' : 'Sign Up Staff Member'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default RegisterStaff;