import React, { useState, useEffect, useRef } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import '../styles/BloodDonorForm.css';

const QUESTION_LIST = [
    { key: 'q1',  id: 1  },
    { key: 'q2',  id: 2  },
    { key: 'q3',  id: 3  },
    { key: 'q4',  id: 4  },
    { key: 'q5',  id: 5  },
    { key: 'q6',  id: 6  },
    { key: 'q7',  id: 7  },
    { key: 'q8',  id: 8  },
    { key: 'q9',  id: 9,  subheading: "subheading_1" },
    { key: 'q10', id: 10 },
    { key: 'q11', id: 11 },
    { key: 'q12', id: 12, subheading: "subheading_2" },
    { key: 'q13', id: 13 },
    { key: 'q14', id: 14 },
    { key: 'q15', id: 15 },
    { key: 'q16', id: 16 },
    { key: 'q17', id: 17 },
    { key: 'q18', id: 18 },
    { key: 'q19', id: 19 },
    { key: 'q20', id: 20, subheading: "subheading_3" },
    { key: 'q21', id: 21 },
    { key: 'q22', id: 22 },
    { key: 'q23', id: 23 },
    { key: 'q24', id: 24 },
    { key: 'q25', id: 25 },
    { key: 'q26', id: 26, subheading: "subheading_4" },
    { key: 'q27', id: 27 },
    { key: 'q28', id: 28 },
    { key: 'q29', id: 29 },
    { key: 'q30', id: 30 },
    { key: 'q31', id: 31 },
    { key: 'q32', id: 32 },
    { key: 'q33', id: 33, subheading: "subheading_5" },
    { key: 'q34', id: 34 },
    { key: 'q35', id: 35 },
    { key: 'q36', id: 36 },
    { key: 'q37', id: 37 },
]

function BloodDonorForm(){

    const {t, i18n } = useTranslation();
    const [submitting, setSubmitting] = useState(false);
    const [questions, setQuestions] = useState(
        QUESTION_LIST.map(q=>({...q, answer: '', remark: '', date: ''}))
    )

    const updateQuestion = (id, field, value) => {
        setQuestions(prev=>
            prev.map(q=>(q.id === id ? {...q, [field]: value} : q))
        )
    }
    const [formData, setFormData] = useState({
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
        otherID: ''
    })

    const handleFormSubmission = async(e) => {
        e.preventDefault()

    }


    return (
        <div className="donorform-container">

            <button onClick={()=>i18n.changeLanguage('en')}> English </button>
            <button onClick={()=>i18n.changeLanguage('fil')}> Filipino </button>

            <form onSubmit={handleFormSubmission} className="donor-form">

                <div className="donorform-fieldgroup">
                    <label>
                        {t('formData.lastName', "Surname")}
                        <input type="text" 
                            value = {formData.lastName}
                            onChange = {(e) => 
                                setFormData({...formData, lastName: e.target.value})
                            }
                            required
                        />
                    </label>
                    <label>
                        {t('formData.firstName', "First Name")}
                        <input type="text" 
                            value = {formData.firstName}
                            onChange = {(e) => 
                                setFormData({...formData, firstName: e.target.value})
                            }
                            required
                        />
                    </label>
                    <label>
                        {t('formData.middleName', "Middle Name")}
                        <input type="text" 
                            value = {formData.middleName}
                            onChange = {(e) => 
                                setFormData({...formData, middleName: e.target.value})
                            }
                            
                        />
                    </label>
                </div>

                <div className="donorform-fieldgroup">
                    <label>
                        {t('formData.birthDate', "Birth Date")}
                        <input type="date" 
                            value = {formData.birthDate}
                            onChange = {(e) => 
                                setFormData({...formData, birthDate: e.target.value})
                            }
                            required
                        />
                    </label>
                    <label>
                        {t('formData.age', "Age")}
                        <input type="number" 
                            value = {formData.birthDate}
                            onChange = {(e) => 
                                setFormData({...formData, birthDate: e.target.value})
                            }
                            min = "16"
                            max = "65"
                            required
                        />
                    </label>
                    <label>
                        {t('formData.civilStatus', "Civil Status")}
                        <input type="text" 
                            value = {formData.civilStatus}
                            onChange = {(e) => 
                                setFormData({...formData, civilStatus: e.target.value})
                            }
                            required
                        />
                    </label>
                    <label>
                        {t('formData.sex', "Sex")}
                        <input type="text" 
                            value = {formData.sex}
                            onChange = {(e) => 
                                setFormData({...formData, sex: e.target.value})
                            }

                        />
                    </label>
                </div>

                <div className="donorform-fieldgroup">
                    <label>
                        {t('formData.houseNumber', "House Number")}
                        <input type="text" 
                            value = {formData.houseNumber}
                            onChange = {(e) => 
                                setFormData({...formData, houseNumber: e.target.value})
                            }
                            required
                        />
                    </label>
                    <label>
                        {t('formData.street', "Street")}
                        <input type="text" 
                            value = {formData.street}
                            onChange = {(e) => 
                                setFormData({...formData, street: e.target.value})
                            }
                            required
                        />
                    </label>
                    <label>
                        {t('formData.barangay', "Barangay")}
                        <input type="text" 
                            value = {formData.barangay}
                            onChange = {(e) => 
                                setFormData({...formData, barangay: e.target.value})
                            }
                            required
                        />
                    </label>
                    <label>
                        {t('formData.municipality', "Town/Municipality")}
                        <input type="text" 
                            value = {formData.municipality}
                            onChange = {(e) => 
                                setFormData({...formData, municipality: e.target.value})
                            }

                        />
                    </label>
                    <label>
                        {t('formData.province', "Province/City")}
                        <input type="text" 
                            value = {formData.province}
                            onChange = {(e) => 
                                setFormData({...formData, province: e.target.value})
                            }

                        />
                    </label>
                    <label>
                        Zip Code:
                        <input type="text" 
                            value = {formData.zipCode}
                            onChange = {(e) => 
                                setFormData({...formData, zipCode: e.target.value})
                            }

                        />
                    </label>
                </div>
                
                <div className="donorform-fieldgroup">
                    <label>
                        {t('formData.officeAddress', "Office Address")}
                        <input type="text" 
                            value = {formData.officeAddress}
                            onChange = {(e) => 
                                setFormData({...formData, officeAddress: e.target.value})
                            }

                        />
                    </label>
                </div>

                <div className="donorform-fieldgroup">
                    <label>
                        {t('formData.nationality', "Nationality")}
                        <input type="text" 
                            value = {formData.nationality}
                            onChange = {(e) => 
                                setFormData({...formData, nationality: e.target.value})
                            }
                            required
                        />
                    </label>
                    <label>
                        {t('formData.religion', "Religion")}
                        <input type="text" 
                            value = {formData.religion}
                            onChange = {(e) => 
                                setFormData({...formData, religion: e.target.value})
                            }
                        />
                    </label>
                    <label>
                        {t('formData.education', "Education")}
                        <input type="text" 
                            value = {formData.education}
                            onChange = {(e) => 
                                setFormData({...formData, education: e.target.value})
                            }
                            required
                        />
                    </label>
                    <label>
                        {t('formData.occupation', "Occupation")}
                        <input type="text" 
                            value = {formData.occupation}
                            onChange = {(e) => 
                                setFormData({...formData, occupation: e.target.value})
                            }
                        />
                    </label>
                </div>

                <div className="donorform-fieldgroup">
                    <label>
                        Telephone Number:
                        <input type="text" 
                            value = {formData.telephoneNumber}
                            onChange = {(e) => 
                                setFormData({...formData, telephoneNumber: e.target.value})
                            }
                        />
                    </label>
                    <label>
                        Mobile Number:
                        <input type="text" 
                            value = {formData.mobileNumber}
                            onChange = {(e) => 
                                setFormData({...formData, mobileNumber: e.target.value})
                            }
                        />
                    </label>
                    <label>
                        E-mail Address:
                        <input type="text" 
                            value = {formData.email}
                            onChange = {(e) => 
                                setFormData({...formData, email: e.target.value})
                            }
                            required
                        />
                    </label>
                </div>

                <div className="donorform-fieldgroup">
                    <label>
                        School ID:
                        <input type="text" 
                            value = {formData.schoolID}
                            onChange = {(e) => 
                                setFormData({...formData, schoolID: e.target.value})
                            }
                        />
                    </label>
                    <label>
                        Company ID:
                        <input type="text" 
                            value = {formData.companyID}
                            onChange = {(e) => 
                                setFormData({...formData, companyID: e.target.value})
                            }
                        />
                    </label>
                    <label>
                        PRC ID:
                        <input type="text" 
                            value = {formData.prcID}
                            onChange = {(e) => 
                                setFormData({...formData, prcID: e.target.value})
                            }
                        />
                    </label>
                    <label>
                        Driver's License ID:
                        <input type="text" 
                            value = {formData.driverID}
                            onChange = {(e) => 
                                setFormData({...formData, driverID: e.target.value})
                            }
                        />
                    </label>
                    <label>
                        SSS/GSIS/BIR ID:
                        <input type="text" 
                            value = {formData.govID}
                            onChange = {(e) => 
                                setFormData({...formData, govID: e.target.value})
                            }
                        />
                    </label>
                    <label>
                        Other IDs:
                        <input type="text" 
                            value = {formData.otherID}
                            onChange = {(e) => 
                                setFormData({...formData, otherID: e.target.value})
                            }
                        />
                    </label>
                    
                </div>

                    <div className="questionnaire">
                    <h3>Medical History</h3>

                    {questions.map((q) => (

                        

                        
                        <div key={q.id} className="question-row">

                        
                            {q.subheading && (
                                <div className="question-subheading">
                                    <Trans                         
                                        i18nKey={`questionnaire.${q.subheading}`}
                                        components={{ bold: <strong /> }}
                                    />
                                </div>
                            )}

                            <span className="question-text">
                                <Trans                         
                                    i18nKey={`questionnaire.q${q.id}`}
                                    components={{ bold: <strong /> }}
                                />
                            </span>

                            {
                                (q.id === 37 || q.id === 34) ? (
                                    <label>
                                        {t('common.date', 'Date: ')}
                                        <input
                                            type="date"
                                            value={q.date}
                                            onChange={(e) => updateQuestion(q.id, 'date', e.target.value)}
                                        />
                                        
                                    </label>

                                ) : (
                                    <>
                                    <label>
                                        <input
                                            type="radio"
                                            name={`q-${q.id}`}
                                            value="yes"
                                            checked={q.answer === 'yes'}
                                            onChange={() => updateQuestion(q.id, 'answer', 'yes')}
                                        />
                                        {t('common.yes', 'Yes')}
                                    </label>

                                    <label>
                                        <input
                                            type="radio"
                                            name={`q-${q.id}`}
                                            value="no"
                                            checked={q.answer === 'no'}
                                            onChange={() => updateQuestion(q.id, 'answer', 'no')}
                                        />
                                        {t('common.no', 'No')}
                                    </label>

                                    <input
                                        type="text"
                                        placeholder={t('common.remarks', 'Remarks')}
                                        value={q.remark}
                                        onChange={(e) => updateQuestion(q.id, 'remark', e.target.value)}
                                        disabled={q.answer !== 'yes'}
                                    />
                                    
                                    </>
                                )
                            }

                            
                        </div>
                    ))}
                </div>

                <div className="donorform-actions">
                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={submitting}
                    >
                        {submitting && <span className="btn-spinner" aria-hidden="true" />}
                        {submitting ? 'Submitting...' : 'Submit Form'}
                    </button>
                </div>

            </form>
            
        </div>

        
    )

}


export default BloodDonorForm;