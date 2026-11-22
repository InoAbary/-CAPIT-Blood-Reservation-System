import React, { useState, useEffect, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom'
import '../styles/Register.css'
import NotificationOptions from '../components/NotificationOptions';
import { RELIGION_OPTIONS } from '../utils/donorFieldOptions';

function FieldLabel({ children, required = false }) {
    return (
        <span className="register-label-text">
            {children}
            {required && <span className="register-required-mark" aria-hidden="true">*</span>}
        </span>
    );
}

function calculateAge(birthDate) {
    if (!birthDate) return '';

    const today = new Date();
    const birth = new Date(birthDate);

    if (Number.isNaN(birth.getTime())) return '';

    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age--;
    }

    return age >= 0 ? age : '';
}

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
        bloodType: '',
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
        notificationPreferences: { sms: true, email: true },
        schoolID: '',
        companyID: '',
        prcID: '',
        driverID: '',
        govID: '',
        otherID: '',
        password:'',
        confirmPassword:''
    })

    useEffect(() => {
        const computed = calculateAge(donorData.birthDate);
        if (String(computed) !== String(donorData.age)) {
            setDonorData(prev => ({ ...prev, age: computed }));
        }
    }, [donorData.birthDate, donorData.age]);

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
                <p className="register-required-note"><span aria-hidden="true">*</span> Required field</p>

                {/* --- Name --- */}
                <div className="register-fieldgroup">
                    <label><FieldLabel required>{t('donorData.lastName', 'Surname')}</FieldLabel>
                        <input type="text" required {...bind('lastName')} />
                    </label>
                    <label><FieldLabel required>{t('donorData.firstName', 'First Name')}</FieldLabel>
                        <input type="text" required {...bind('firstName')} />
                    </label>
                    <label>{t('donorData.middleName', 'Middle Name')}
                        <input type="text" {...bind('middleName')} />
                    </label>
                </div>

                {/* --- Demographics --- */}
                <div className="register-fieldgroup">
                    <label><FieldLabel required>{t('donorData.birthDate', 'Birth Date')}</FieldLabel>
                        <input type="date" required {...bind('birthDate')} />
                    </label>
                    <label><FieldLabel>{t('donorData.age', 'Age')}</FieldLabel>
                        <input type="number" min="16" max="65" disabled required {...bind('age')} />
                    </label>
                    <label><FieldLabel required>{t('donorData.civilStatus', 'Civil Status')}</FieldLabel>
                        <input type="text" required {...bind('civilStatus')} />
                    </label>
                    <label><FieldLabel required>{t('donorData.sex', 'Sex')}</FieldLabel>
                        <span className="register-select-wrap">
                            <select required {...bind('sex')}>
                                <option value="" disabled>{t('donorData.selectSex', 'Select Sex')}</option>
                                <option value="Male">{t('donorData.male', 'Male')}</option>
                                <option value="Female">{t('donorData.female', 'Female')}</option>
                            </select>
                        </span>
                    </label>
                    <label><FieldLabel required>{t('donorData.bloodType', 'Blood Type')}</FieldLabel>
                        <span className="register-select-wrap">
                            <select required {...bind('bloodType')}>
                                <option value="" disabled>{t('donorData.selectBloodType', 'Select Blood Type')}</option>
                                <option value="A+">A+</option>
                                <option value="A-">A-</option>
                                <option value="B+">B+</option>
                                <option value="B-">B-</option>
                                <option value="O+">O+</option>
                                <option value="O-">O-</option>
                                <option value="AB+">AB+</option>
                                <option value="AB-">AB-</option>
                            </select>
                        </span>
                    </label>
                </div>

                {/* --- Address --- */}
                <div className="register-fieldgroup">
                    <label><FieldLabel required>{t('donorData.houseNumber', 'House Number')}</FieldLabel>
                        <input type="text" required {...bind('houseNumber')} />
                    </label>
                    <label><FieldLabel required>{t('donorData.street', 'Street')}</FieldLabel>
                        <input type="text" required {...bind('street')} />
                    </label>
                    <label><FieldLabel required>{t('donorData.barangay', 'Barangay')}</FieldLabel>
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
                    <label><FieldLabel required>{t('donorData.nationality', 'Nationality')}</FieldLabel>
                        <input type="text" required {...bind('nationality')} />
                    </label>
                    <label>{t('donorData.religion', 'Religion')}
                        <span className="register-select-wrap">
                            <select {...bind('religion')}>
                                <option value="">Select Religion</option>
                                {RELIGION_OPTIONS.map(option => (
                                    <option key={option} value={option}>{option}</option>
                                ))}
                            </select>
                        </span>
                    </label>
                    <label><FieldLabel required>{t('donorData.education', 'Education')}</FieldLabel>
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
                    <label><FieldLabel required>Mobile Number</FieldLabel>
                        <input type="tel" autoComplete="tel" required {...bind('mobileNumber')} />
                    </label>
                    <label><FieldLabel required>E-mail Address</FieldLabel>
                        <input type="email" required {...bind('email')} />
                    </label>
                </div>

                <NotificationOptions
                    value={donorData.notificationPreferences}
                    onChange={notificationPreferences => setDonorData(current => ({ ...current, notificationPreferences }))}
                    disabled={submitting}
                />

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
                        <label><FieldLabel required>Password</FieldLabel>
                            <input type="password" required {...bind('password')} />
                        </label>
                        <label><FieldLabel required>Confirm Password</FieldLabel>
                            <input type="password" required {...bind('confirmPassword')} />
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
