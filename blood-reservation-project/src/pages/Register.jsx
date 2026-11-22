import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom'
import '../styles/Register.css'
import NotificationOptions from '../components/NotificationOptions';

const REGISTRATION_CHOICES = {
    civilStatus: ['Single', 'Married', 'Separated', 'Widowed', 'Divorced', 'Annulled'],
    nationality: ['Filipino'],
    religion: ['Roman Catholic', 'Other Christian', 'Islam', 'Buddhism', 'Hinduism', 'Judaism', 'No religion', 'Prefer not to say'],
    education: ['No formal education', 'Elementary', 'Junior high school', 'Senior high school', 'Vocational or technical', 'College undergraduate', 'College graduate', 'Postgraduate']
};
const OTHER_CHOICE = '__other__';

function RequiredLabel({ children }) {
    return <span>{children} <span className="register-required" aria-hidden="true">*</span></span>;
}

function RegistrationChoice({ field, label, value, onChange, required = false }) {
    const { t } = useTranslation();
    const [isOther, setIsOther] = useState(false);

    function selectOption(event) {
        const selection = event.target.value;
        setIsOther(selection === OTHER_CHOICE);
        onChange(selection === OTHER_CHOICE ? '' : selection);
    }

    return (
        <div className="register-choice">
            <label>
                {required ? <RequiredLabel>{label}</RequiredLabel> : label}
                <select required={required} value={isOther ? OTHER_CHOICE : value} onChange={selectOption}>
                    <option value="" disabled={required}>
                        {required ? t('registration.selectOption', 'Select an option') : t('registration.optionalChoice', 'Select an option (optional)')}
                    </option>
                    {REGISTRATION_CHOICES[field].map(option => (
                        <option key={option} value={option}>{t(`registration.options.${option}`, option)}</option>
                    ))}
                    <option value={OTHER_CHOICE}>{t('registration.other', 'Other (specify)')}</option>
                </select>
            </label>
            {isOther && (
                <label>
                    <RequiredLabel>{t('registration.specify', '{{field}} (please specify)', { field: label })}</RequiredLabel>
                    <input type="text" required value={value} onChange={event => onChange(event.target.value)} />
                </label>
            )}
        </div>
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

    const setField = (field, value) => setDonorData(current => ({ ...current, [field]: value }));

    const bind = (field) => ({
        value: donorData[field],
        onChange: (event) => setField(field, event.target.value)
    });

    return (
        <div className="register-page">
            <button onClick={() => i18n.changeLanguage('en')}>English</button>
            <button onClick={() => i18n.changeLanguage('fil')}>Filipino</button>

            <form onSubmit={handleFormSubmission} className="register-form">
                <p className="register-required-note">
                    <span className="register-required" aria-hidden="true">*</span>{' '}
                    {t('registration.requiredNote', 'Indicates a required field.')}
                </p>

                {/* --- Name --- */}
                <div className="register-fieldgroup">
                    <label><RequiredLabel>{t('formData.lastName', 'Surname')}</RequiredLabel>
                        <input type="text" required {...bind('lastName')} />
                    </label>
                    <label><RequiredLabel>{t('formData.firstName', 'First Name')}</RequiredLabel>
                        <input type="text" required {...bind('firstName')} />
                    </label>
                    <label>{t('formData.middleName', 'Middle Name')}
                        <input type="text" {...bind('middleName')} />
                    </label>
                </div>

                {/* --- Demographics --- */}
                <div className="register-fieldgroup">
                    <label><RequiredLabel>{t('formData.birthDate', 'Birth Date')}</RequiredLabel>
                        <input type="date" required {...bind('birthDate')} />
                    </label>
                    <label>{t('formData.age', 'Age')}
                        <input type="number" min="16" max="65" disabled {...bind('age')} />
                    </label>
                    <RegistrationChoice
                        field="civilStatus"
                        label={t('formData.civilStatus', 'Civil Status')}
                        value={donorData.civilStatus}
                        onChange={value => setField('civilStatus', value)}
                        required
                    />
                    <label><RequiredLabel>{t('formData.sex', 'Sex')}</RequiredLabel>
                        <select required {...bind('sex')}>
                            <option value="" disabled>{t('registration.selectSex', 'Select Sex')}</option>
                            <option value="Male">{t('registration.options.Male', 'Male')}</option>
                            <option value="Female">{t('registration.options.Female', 'Female')}</option>
                        </select>
                    </label>
                    <label><RequiredLabel>{t('registration.bloodType', 'Blood Type')}</RequiredLabel>
                        <select required {...bind('bloodType')}>
                            <option value="" disabled>{t('registration.selectBloodType', 'Select Blood Type')}</option>
                            <option value="A+">A+</option>
                            <option value="A-">A-</option>
                            <option value="B+">B+</option>
                            <option value="B-">B-</option>
                            <option value="O+">O+</option>
                            <option value="O-">O-</option>
                            <option value="AB+">AB+</option>
                            <option value="AB-">AB-</option>
                        </select>
                    </label>
                </div>

                {/* --- Address --- */}
                <div className="register-fieldgroup">
                    <label><RequiredLabel>{t('formData.houseNumber', 'House Number')}</RequiredLabel>
                        <input type="text" required {...bind('houseNumber')} />
                    </label>
                    <label><RequiredLabel>{t('formData.street', 'Street')}</RequiredLabel>
                        <input type="text" required {...bind('street')} />
                    </label>
                    <label><RequiredLabel>{t('formData.barangay', 'Barangay')}</RequiredLabel>
                        <input type="text" required {...bind('barangay')} />
                    </label>
                    <label>{t('formData.municipality', 'Town/Municipality')}
                        <input type="text" {...bind('municipality')} />
                    </label>
                    <label>{t('formData.province', 'Province/City')}
                        <input type="text" {...bind('province')} />
                    </label>
                    <label>{t('formData.zipCode', 'Zip Code')}
                        <input type="text" {...bind('zipCode')} />
                    </label>
                </div>

                {/* --- Office address (full width) --- */}
                <div className="register-fieldgroup is-full">
                    <label>{t('formData.officeAddress', 'Office Address')}
                        <input type="text" {...bind('officeAddress')} />
                    </label>
                </div>

                {/* --- Background --- */}
                <div className="register-fieldgroup">
                    <RegistrationChoice
                        field="nationality"
                        label={t('registration.nationality', 'Nationality')}
                        value={donorData.nationality}
                        onChange={value => setField('nationality', value)}
                        required
                    />
                    <RegistrationChoice
                        field="religion"
                        label={t('formData.religion', 'Religion')}
                        value={donorData.religion}
                        onChange={value => setField('religion', value)}
                    />
                    <RegistrationChoice
                        field="education"
                        label={t('formData.education', 'Education')}
                        value={donorData.education}
                        onChange={value => setField('education', value)}
                        required
                    />
                    <label>{t('formData.occupation', 'Occupation')}
                        <input type="text" {...bind('occupation')} />
                    </label>
                </div>

                {/* --- Contact --- */}
                <div className="register-fieldgroup">
                    <label>{t('formData.telephoneNumber', 'Telephone Number')}
                        <input type="text" {...bind('telephoneNumber')} />
                    </label>
                    <label>{t('formData.mobileNumber', 'Mobile Number')}
                        <input type="text" {...bind('mobileNumber')} />
                    </label>
                    <label><RequiredLabel>{t('formData.email', 'E-mail Address')}</RequiredLabel>
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
                        <label><RequiredLabel>{t('registration.password', 'Password')}</RequiredLabel>
                            <input type="password" required {...bind('password')} />
                        </label>
                        <label><RequiredLabel>{t('registration.confirmPassword', 'Confirm Password')}</RequiredLabel>
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

