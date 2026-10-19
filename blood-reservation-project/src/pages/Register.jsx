import React, { useState, useEffect, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom'
import '../styles/Register.css'

function Register(){

    const {t, i18n} = useTranslation();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false)
    const [donorData, setDonorData] = useState({
        lastName: '',
        firstName: '',
        middleName: '',
        birthDate: '',
        age: '',
        civilStatus: '',
        sex: '',
        houseNumber: '',
        street: '',
        barangay: '',
        municipality: '',
        province: '',
        zipCode: '',
        officeAddress: '',
        nationality: '',
        religion: '',
        education: '',
        occupation: '',
        telephoneNumber: '',
        mobileNumber: '',
        email: '',
        schoolID: '',
        companyID: '',
        prcID: '',
        driverID: '',
        govID: '',
        otherID: '',
        password:'',
        confirmPassword:''
    })

    const handleFormSubmission = async(e) => {
        e.preventDefault()

        if (donorData.password !== donorData.confirmPassword) {
            alert('Passwords do not match.');
            return;
        }

        setSubmitting(true)

        try{

            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify(donorData)
            })

            const body = await res.json()
            if (!res.ok) throw new Error(body.error || 'Registration failed.')
            
            navigate('/Register/Success', {
                state: { email: donorData.email },
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
        value: donorData[field],
        onChange: (e) => setDonorData({ ...donorData, [field]: e.target.value })
    });

    return (
        <div className="register-page">
            <button onClick={() => i18n.changeLanguage('en')}>English</button>
            <button onClick={() => i18n.changeLanguage('fil')}>Filipino</button>

            <form onSubmit={handleFormSubmission} className="register-form">

                {/* --- Name --- */}
                <div className="register-fieldgroup">
                    <label>{t('donorData.lastName', 'Surname')}
                        <input type="text" required {...bind('lastName')} />
                    </label>
                    <label>{t('donorData.firstName', 'First Name')}
                        <input type="text" required {...bind('firstName')} />
                    </label>
                    <label>{t('donorData.middleName', 'Middle Name')}
                        <input type="text" {...bind('middleName')} />
                    </label>
                </div>

                {/* --- Demographics --- */}
                <div className="register-fieldgroup">
                    <label>{t('donorData.birthDate', 'Birth Date')}
                        <input type="date" required {...bind('birthDate')} />
                    </label>
                    <label>{t('donorData.age', 'Age')}
                        <input type="number" min="16" max="65" required {...bind('age')} />
                    </label>
                    <label>{t('donorData.civilStatus', 'Civil Status')}
                        <input type="text" required {...bind('civilStatus')} />
                    </label>
                    <label>{t('donorData.sex', 'Sex')}
                        <select required {...bind('sex')}>
                            <option value="" disabled>{t('donorData.selectSex', 'Select Sex')}</option>
                            <option value="Male">{t('donorData.male', 'Male')}</option>
                            <option value="Female">{t('donorData.female', 'Female')}</option>
                        </select>
                    </label>
                </div>

                {/* --- Address --- */}
                <div className="register-fieldgroup">
                    <label>{t('donorData.houseNumber', 'House Number')}
                        <input type="text" required {...bind('houseNumber')} />
                    </label>
                    <label>{t('donorData.street', 'Street')}
                        <input type="text" required {...bind('street')} />
                    </label>
                    <label>{t('donorData.barangay', 'Barangay')}
                        <input type="text" required {...bind('barangay')} />
                    </label>
                    <label>{t('donorData.municipality', 'Town/Municipality')}
                        <input type="text" {...bind('municipality')} />
                    </label>
                    <label>{t('donorData.province', 'Province/City')}
                        <input type="text" {...bind('province')} />
                    </label>
                    <label>Zip Code
                        <input type="text" {...bind('zipCode')} />
                    </label>
                </div>

                {/* --- Office address (full width) --- */}
                <div className="register-fieldgroup is-full">
                    <label>{t('donorData.officeAddress', 'Office Address')}
                        <input type="text" {...bind('officeAddress')} />
                    </label>
                </div>

                {/* --- Background --- */}
                <div className="register-fieldgroup">
                    <label>{t('donorData.nationality', 'Nationality')}
                        <input type="text" required {...bind('nationality')} />
                    </label>
                    <label>{t('donorData.religion', 'Religion')}
                        <input type="text" {...bind('religion')} />
                    </label>
                    <label>{t('donorData.education', 'Education')}
                        <input type="text" required {...bind('education')} />
                    </label>
                    <label>{t('donorData.occupation', 'Occupation')}
                        <input type="text" {...bind('occupation')} />
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

                {/* --- IDs + passwords --- */}
                <div className="register-fieldgroup">
                    <label>School ID
                        <input type="text" {...bind('schoolID')} />
                    </label>
                    <label>Company ID
                        <input type="text" {...bind('companyID')} />
                    </label>
                    <label>PRC ID
                        <input type="text" {...bind('prcID')} />
                    </label>
                    <label>Driver's License ID
                        <input type="text" {...bind('driverID')} />
                    </label>
                    <label>SSS/GSIS/BIR ID
                        <input type="text" {...bind('govID')} />
                    </label>
                    <label>Other IDs
                        <input type="text" {...bind('otherID')} />
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
                        {submitting ? 'Signing up...' : 'Sign Up'}
                    </button>
                </div>
            </form>
        </div>
    );
}

export default Register;