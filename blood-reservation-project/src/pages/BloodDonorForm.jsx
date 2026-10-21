import React, { useState, useMemo } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import '../styles/Dashboard.css';
import '../styles/BloodDonorForm.css';
import {useAuth} from '../context/AuthContext'

const DATE_ONLY = [34, 37];
const FEMALE_ONLY_QUESTIONS = new Set([33, 34, 35, 36, 37]);

const QUESTION_LIST = [
    { key: 'q1',  id: 1, rejectReason: 'You are not in a healthy condition to perform a blood donation now.'  },
    { key: 'q2',  id: 2, rejectReason: 'You cannot donate blood if you are not allowed to.' },
    { key: 'q3',  id: 3, rejectReason: 'You do not need to donate blood if you want to be tested for HIV, AIDS, or Hepatitis.' },
    { key: 'q4',  id: 4 },
    { key: 'q5',  id: 5, rejectReason: 'You cannot donate blood if you have taken alcohol.' },
    { key: 'q6',  id: 6, rejectReason: 'You cannot donate blood if you have recently taken aspirin.' },
    { key: 'q7',  id: 7, rejectReason: 'You cannot donate blood if you have taken any vaccinations or medications recently.' },
    { key: 'q8',  id: 8, rejectReason: 'You cannot donate blood if you have just donated within 3 months.' },
    { key: 'q9',  id: 9, subheading: "subheading_1" },
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
    { key: 'q33', id: 33, subheading: "subheading_5", rejectReason: 'You cannot donate blood if you are pregnant.' },
    { key: 'q34', id: 34 },
    { key: 'q35', id: 35 },
    { key: 'q36', id: 36, rejectReason: 'You cannot donate blood if you are breastfeeding.' },
    { key: 'q37', id: 37 },
];

const DENY_YES = new Set([2, 3, 5, 6, 7, 8, 33, 36]);
const DENY_NO = new Set([1]);

function ShouldDeny(q, answer) {
    if (DATE_ONLY.includes(q.id)) return false;
    const ans = String(answer ?? '').toLowerCase();
    if (DENY_YES.has(q.id) && ans === 'yes') return true;
    if (DENY_NO.has(q.id) && ans === 'no') return true;
    return false;
}

/* Reusable top menu – matches DonorDashboard */
function DonorTopMenu() {
    const navigate = useNavigate();

    const navItems = [
        { label: 'Overview', path: '/DonorDashboard', icon: '📊' },
        { label: 'Blood Bank Map', path: '/BloodBankMap', icon: '🗺️' },
        { label: 'Donor Application Form', path: '/BloodDonorForm', icon: '💝' },
        { label: 'Profile Settings', path: '/donor/profile', icon: '⚙️' },
    ];

    return (
        <header className="dashboard-menu">
            <div className="dashboard-logo">
                <h2>Donor Hub</h2>
                <p className="welcome-text">Welcome back!</p>
            </div>

            <nav className="nav-links">
                {navItems.map((item) => (
                    <Link key={item.path} to={item.path} className="nav-link">
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                    </Link>
                ))}
            </nav>

            <div className="menu-footer">
                <button
                    className="quick-action-btn"
                    onClick={() => navigate('/donor/new-donation')}
                >
                    + New Donation
                </button>
            </div>
        </header>
    );
}

function BloodDonorForm() {
    const { t, i18n } = useTranslation();
    const navigate = useNavigate();
    const [submitting, setSubmitting] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [rejected, setRejected] = useState(false);

    const {user, loading} = useAuth()
    const userSex = user?.sex
    const [questionsState, setQuestionsState] = useState(
        QUESTION_LIST.map(q => ({ ...q, answer: '', remark: '', date: '' }))
    );

    const questions = useMemo(()=> {
        if (userSex === 'Female') return questionsState;
        return questionsState.filter(q=> !FEMALE_ONLY_QUESTIONS.has(q.id))
    }, [questionsState, userSex])

    const curQuestion = questions[stepIndex];
    const isLastStep = stepIndex === questions.length - 1;


    const progress = useMemo(
        () => Math.round(((stepIndex + 1) / questions.length) * 100),
        [stepIndex, questions.length]
    );

    const updateQuestion = (id, field, value) => {
        setQuestionsState(prev =>
            prev.map(q => (q.id === id ? { ...q, [field]: value } : q))
        );
    };

    const goNext = () => {
        if (isLastStep) {
            submitForm();
        } else {
            setStepIndex(i => i + 1);
        }
    };

    const goBack = () => {
        if (stepIndex > 0) {
            updateQuestion(stepIndex, 'answer', '');
            setStepIndex(i => i - 1);
            if (!DATE_ONLY.includes(stepIndex)) {
                updateQuestion(curQuestion.id, 'answer', '');
            }
        }
    };

    

    const handleAnswer = (answer) => {
        updateQuestion(curQuestion.id, 'answer', answer);

        if (ShouldDeny(curQuestion, answer)) {
            setRejected(true);
            return;
        }

        queueMicrotask(() => goNext());
    };

    const handleDateChange = (value) => {
        updateQuestion(curQuestion.id, 'date', value);
    };

    const handleDateNext = (value) => {
        updateQuestion(curQuestion.id, 'date', value);
        queueMicrotask(() => goNext());
    };

    const submitForm = async () => {
        setSubmitting(true);

        try {
            const answersPayload = {
                donor: user._id || user.id,
                answers: questions.map(q => {
                    if (DATE_ONLY.includes(q.id)) {
                        return {
                            qId: q.id,
                            date: q.date ? new Date(q.date) : null,
                        };
                    }
                    return {
                        qId: q.id,
                        result:
                            q.answer === 'yes' ? true :
                            q.answer === 'no'  ? false :
                            undefined,
                        remarks: q.remark || undefined,
                    };
                }),
            };

            const answersRes = await fetch('/api/bloodForm/form-answers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(answersPayload),
            });
            if (!answersRes.ok) throw new Error(answersRes.error);

            navigate(rejected ? '/FormDeny' : '/FormPending');
        } catch (err) {
            console.error(err);
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || !curQuestion) {
        return (
            <div className="dashboard-container top-menu-layout">
                <DonorTopMenu />
                <main className="dashboard-content">
                    <div className="donorform-container">
                        <p>{t('common.loading', 'Loading…')}</p>
                    </div>
                </main>
            </div>
        );
    }

    /* ---------- Rejected view ---------- */
    if (rejected) {
        const dismissRejection = () => {
            updateQuestion(curQuestion.id, 'answer', '');
            setRejected(false);
        };

        return (
            <div className="dashboard-container top-menu-layout">
                <DonorTopMenu />
                <main className="dashboard-content">
                    <div className="donorform-container">
                        <div className="language-switcher">
                            <button onClick={() => i18n.changeLanguage('en')}>English</button>
                            <button onClick={() => i18n.changeLanguage('fil')}>Filipino</button>
                        </div>

                        <div className="donorform-rejected">
                            <h3>{t('questionnaire.rejectedTitle', 'Thank you for your interest.')}</h3>
                            <p>
                                {t(
                                    'questionnaire.rejectedBody',
                                    'Based on your answers, you are not eligible to donate blood at this time.'
                                )}
                            </p>

                            {curQuestion.rejectReason && (
                                <p>
                                    {t('questionnaire.rejectedReason', 'Reason: ')}
                                    {t(
                                        `questionnaire.rejectReason_q${curQuestion.id}`,
                                        curQuestion.rejectReason
                                    )}
                                </p>
                            )}

                            <button
                                type="button"
                                className="submit-btn"
                                onClick={dismissRejection}
                            >
                                {t('common.continue', 'Return to questions')}
                            </button>
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    /* ---------- Per-step rendering ---------- */
    const isDateQuestion = DATE_ONLY.includes(curQuestion.id);

    
    return (
        <div className="dashboard-container top-menu-layout">
            <DonorTopMenu />

            <main className="dashboard-content">
                <div className="donorform-container">
                    <div className="language-switcher">
                        <button onClick={() => i18n.changeLanguage('en')}>English</button>
                        <button onClick={() => i18n.changeLanguage('fil')}>Filipino</button>
                    </div>

                    <div className="donor-form">
                        {/* Progress bar */}
                        <div className="progress-wrap">
                            <div className="progress-bar" style={{ width: `${progress}%` }} />
                            <span className="progress-label">
                                {stepIndex + 1} / {questions.length}
                            </span>
                        </div>

                        {curQuestion.subheading && (
                            <div className="question-subheading">
                                <Trans
                                    i18nKey={`questionnaire.${curQuestion.subheading}`}
                                    components={{ bold: <strong /> }}
                                />
                            </div>
                        )}

                        <div className="question-row is-stepped">
                            <span className="question-text">
                                <Trans
                                    i18nKey={`questionnaire.q${curQuestion.id}`}
                                    components={{ bold: <strong /> }}
                                />
                            </span>

                            {isDateQuestion ? (
                                <label>
                                    {t('common.date', 'Date: ')}
                                    <input
                                        type="date"
                                        value={curQuestion.date}
                                        onChange={(e) => handleDateChange(e.target.value)}
                                    />
                                </label>
                            ) : (
                                <>
                                    <label>
                                        <input
                                            type="radio"
                                            name={`q-${curQuestion.id}`}
                                            value="yes"
                                            checked={curQuestion.answer === 'yes'}
                                            onChange={() => handleAnswer('yes')}
                                        />
                                        {t('common.yes', 'Yes')}
                                    </label>
                                    <label>
                                        <input
                                            type="radio"
                                            name={`q-${curQuestion.id}`}
                                            value="no"
                                            checked={curQuestion.answer === 'no'}
                                            onChange={() => handleAnswer('no')}
                                        />
                                        {t('common.no', 'No')}
                                    </label>
                                    <input
                                        type="text"
                                        placeholder={t('common.remarks', 'Remarks')}
                                        value={curQuestion.remark}
                                        onChange={(e) =>
                                            updateQuestion(curQuestion.id, 'remark', e.target.value)
                                        }
                                    />
                                </>
                            )}
                        </div>

                        <div className="donorform-actions">
                            <button
                                type="button"
                                className="back-btn"
                                onClick={goBack}
                                disabled={stepIndex === 0 || submitting}
                            >
                                {t('common.back', 'Back')}
                            </button>

                            {isDateQuestion && (
                                <button
                                    type="button"
                                    className="submit-btn"
                                    onClick={handleDateNext}
                                    disabled={submitting}
                                >
                                    {(isLastStep)
                                        ? t('common.submit', 'Submit')
                                        : t('common.next', 'Next')}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default BloodDonorForm;