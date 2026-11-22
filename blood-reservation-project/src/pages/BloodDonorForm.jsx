import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Trans, useTranslation } from 'react-i18next';
import { useLocation, useNavigate, Navigate } from 'react-router-dom';
import DonorSidebar from '../components/DonorSidebar';
import '../styles/Dashboard.css';
import '../styles/BloodDonorForm.css';
import {useAuth} from '../context/AuthContext'
import { useDonationCooldown } from '../hooks/useDonationCooldown';
import '../styles/UI.css';

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
    { key: 'q10', id: 10, subheading: "subheading_1"  },
    { key: 'q11', id: 11, subheading: "subheading_1"  },
    { key: 'q12', id: 12, subheading: "subheading_2" },
    { key: 'q13', id: 13, subheading: "subheading_2" },
    { key: 'q14', id: 14, subheading: "subheading_2" },
    { key: 'q15', id: 15, subheading: "subheading_2" },
    { key: 'q16', id: 16, subheading: "subheading_2" },
    { key: 'q17', id: 17, subheading: "subheading_2" },
    { key: 'q18', id: 18, subheading: "subheading_2" },
    { key: 'q19', id: 19, subheading: "subheading_2" },
    { key: 'q20', id: 20, subheading: "subheading_3" },
    { key: 'q21', id: 21, subheading: "subheading_3" },
    { key: 'q22', id: 22, subheading: "subheading_3" },
    { key: 'q23', id: 23, subheading: "subheading_3" },
    { key: 'q24', id: 24, subheading: "subheading_3" },
    { key: 'q25', id: 25, subheading: "subheading_3" },
    { key: 'q26', id: 26, subheading: "subheading_4" },
    { key: 'q27', id: 27, subheading: "subheading_4"  },
    { key: 'q28', id: 28, subheading: "subheading_4"  },
    { key: 'q29', id: 29, subheading: "subheading_4"  },
    { key: 'q30', id: 30, subheading: "subheading_4"  },
    { key: 'q31', id: 31, subheading: "subheading_4"  },
    { key: 'q32', id: 32, subheading: "subheading_4"  },
    { key: 'q33', id: 33, rejectReason: 'You cannot donate blood if you are pregnant.' },
    { key: 'q34', id: 34 },
    { key: 'q35', id: 35 },
    { key: 'q36', id: 36, rejectReason: 'You cannot donate blood if you are breastfeeding.' },
    { key: 'q37', id: 37 },
];

const DENY_YES = new Set([2, 3, 5, 6, 7, 8, 36]);
const DENY_NO = new Set([1]);

function ShouldDeny(q, answer) {
    if (DATE_ONLY.includes(q.id)) return false;
    const ans = String(answer ?? '').toLowerCase();
    if (DENY_YES.has(q.id) && ans === 'yes') return true;
    if (DENY_NO.has(q.id) && ans === 'no') return true;
    return false;
}

function shouldSkip(q, questionsState) {
    if (q.id === 34) {
        const q33 = questionsState.find((x) => x.id === 33);
        return q33?.answer === 'no';
    }
    return false;
}

/* Reusable top menu – matches DonorDashboard */

function BloodDonorForm() {
    const { t, i18n } = useTranslation();

    const location = useLocation();
    const navigate = useNavigate();
    const returnTo = location.state?.returnTo
    const appointmentDraft = location.state?.appointmentDraft;

    const cooldown = useDonationCooldown();

    const [submitting, setSubmitting] = useState(false);
    const [stepIndex, setStepIndex] = useState(0);
    const [rejected, setRejected] = useState(false);

    const [todaySubmission, setTodaySubmission] = useState(null);
    const [checkingTodaySubmission, setCheckingTodaySubmission] = useState(true);
    const [todaySubmissionError, setTodaySubmissionError] = useState('');

    // ── NEW: confirmation modal state ──
    const [showConfirm, setShowConfirm] = useState(false);
    const [hasConfirmed, setHasConfirmed] = useState(false);

    const { donor, loading, logoutDonor } = useAuth();

function handleChangeRole() {
    localStorage.removeItem('donorHubRole');
    navigate('/DonorDashboard');
}

async function handleLogout() {
    localStorage.removeItem('donorHubRole');
    await logoutDonor();
    navigate('/Login', { replace: true });
}

const sidebar = (
    <DonorSidebar
        role="donor"
        firstName={donor?.firstName}
        onChangeRole={handleChangeRole}
        onLogout={handleLogout}
    />
);

const pageHeader = (
    <header className="ui-page-header ui-page-header--card">
        <div className="ui-page-header-copy">
            <h1>{t('questionnaire.pageTitle', 'Donor Application Form')}</h1>
        </div>

    </header>
);

    const userSex = donor?.sex

    useEffect(() => {
        if (loading || !donor) return;
    
        let active = true;
    
        const checkTodaySubmission = async () => {
            try {
                setCheckingTodaySubmission(true);
                setTodaySubmissionError('');
    
                const res = await fetch('/api/bloodForm/form-today');
    
                const data = await res.json().catch(() => ({}));
    
                if (!res.ok) {
                    throw new Error(
                        data.error || 'Could not check today’s prescreening form.'
                    );
                }
    
                if (!active) return;
    
                if (data.submitted) {
                    setTodaySubmission(data.submission);
                } else {
                    setTodaySubmission(null);
                }
            } catch (err) {
                if (active) {
                    setTodaySubmissionError(err.message);
                }
            } finally {
                if (active) {
                    setCheckingTodaySubmission(false);
                }
            }
        };
    
        checkTodaySubmission();
    
        return () => {
            active = false;
        };
    }, [donor, loading]);

    const printRef = useRef(null);
    const [questionsState, setQuestionsState] = useState(
        QUESTION_LIST.map(q => ({ ...q, answer: '', remark: '', date: '' }))
    );

    const questions = useMemo(() => {
        const base = userSex === 'Female'
            ? questionsState
            : questionsState.filter(q => !FEMALE_ONLY_QUESTIONS.has(q.id));

        // Q34 is skipped when Q33 is answered "no"
        return base.filter(q => !shouldSkip(q, questionsState));
    }, [questionsState, userSex]);

    const curQuestion = questions[stepIndex];
    const isLastStep = stepIndex === questions.length - 1;

    useEffect(() => {
        if (stepIndex > questions.length - 1) {
            setStepIndex(Math.max(0, questions.length - 1));
        }
    }, [questions.length, stepIndex]);

    const progress = useMemo(
        () => Math.round(((stepIndex + 1) / questions.length) * 100),
        [stepIndex, questions.length]
    );

    const updateQuestion = (id, field, value) => {
        setQuestionsState(prev =>
            prev.map(q => (q.id === id ? { ...q, [field]: value } : q))
        );
    };

    // ── Can the user advance from the current question? ──
    const canProceed = useMemo(() => {
        if (!curQuestion) return false;
        if (DATE_ONLY.includes(curQuestion.id)) {
            return true;         // date must be filled
        }
        return curQuestion.answer === 'yes' || curQuestion.answer === 'no';
    }, [curQuestion]);

    const goNext = () => {
        if (!canProceed) return;               // safety guard
        if (isLastStep) {
            // ── NEW: show confirmation modal instead of submitting directly ──
            setShowConfirm(true);
        } else {
            setStepIndex(i => i + 1);
        }
    };

    const goBack = () => {
        if (stepIndex === 0) return;

        // Clear only the current question's answer (by id, not index)
        updateQuestion(curQuestion.id, 'answer', '');
        if (DATE_ONLY.includes(curQuestion.id)) {
            updateQuestion(curQuestion.id, 'date', '');
        }

        setStepIndex(i => i - 1);
    };

    // ── Answer selection no longer auto-advances ──
    const handleAnswer = (answer) => {
        updateQuestion(curQuestion.id, 'answer', answer);

        // Rejection still happens immediately — no "Next" needed
        if (ShouldDeny(curQuestion, answer)) {
            setRejected(true);
        }
    };

    const handleDateChange = (value) => {
        updateQuestion(curQuestion.id, 'date', value);
    };

    // ── NEW: confirmation handlers ──
    const handleConfirmSubmit = () => {
        setHasConfirmed(true);
        setShowConfirm(false);
        submitForm();
    };

    const handleCancelConfirm = () => {
        setShowConfirm(false);
        // leave hasConfirmed untouched (if they cancel, they haven't confirmed this submission)
    };

    const submitForm = async () => {
        setSubmitting(true);

        try {
            const answersPayload = {
                donor: donor._id || donor.id,
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
                // ── NEW: send confirmation flag ──
                confirmedTrue: true,
            };

            const answersRes = await fetch('/api/bloodForm/form-answers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(answersPayload),
            });
            if (!answersRes.ok) {
                const body = await answersRes.json().catch(() => ({}));
                const err = new Error(body.error || 'Submission failed');
                err.code = body.code;
                err.lastDonationDate = body.lastDonationDate;
                err.nextEligibleDate = body.nextEligibleDate;
                err.submission = body.submission;
                throw err;
            }

            if (returnTo) {
                navigate(returnTo, {
                  replace: true,
                  state: appointmentDraft
                    ? { appointmentDraft }
                    : undefined,
                });
            } else {
                navigate('/FormPending', {
                    state: {
                        answers: questions.map(q => ({
                            id: q.id,
                            answer: q.answer,
                            remark: q.remark || '',
                            date: q.date || '',
                        })),
                        donorName: donor?.name || donor?.email || '',
                        submittedAt: new Date().toISOString(),
                    },
                });
            }
        } catch (err) {

            if (err.code === 'FORM_ALREADY_SUBMITTED_TODAY') {
                if (err.submission) {
                    setTodaySubmission(err.submission);
                }
                return;
            }
            
            if (err.code === 'DONATION_COOLDOWN') {
                navigate('/DonationCooldown', {
                    replace: true,
                    state: {
                    lastDonationDate: err.lastDonationDate,
                    nextEligibleDate: err.nextEligibleDate,
                    },
                });
                return;
            }
            console.error(err);
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (loading || checkingTodaySubmission || !curQuestion) {
        return (
            <div className="dashboard-container donor-theme ui-dashboard">
                {sidebar}
                <main className="dashboard-content">
                    <div className="donorform-container">
                        <p>{t('common.loading', 'Loading…')}</p>
                    </div>
                </main>
            </div>
        );
    }

    if (todaySubmissionError) {
        return (
            <div className="dashboard-container donor-theme ui-dashboard">
                {sidebar}
    
                <main className="dashboard-content">
                    <div className="donorform-container">
                        <p className="form-message error-message" role="alert">
                            {todaySubmissionError}
                        </p>
                    </div>
                </main>
            </div>
        );
    }

    if (todaySubmission) {
        return (
            <div className="dashboard-container donor-theme ui-dashboard">
                {sidebar}
    
                <main className="dashboard-content submitted-form-page">
                {pageHeader}
                    <div className="submitted-form-wrapper">
                        <div className="language-switcher submitted-language-switcher">
                            <button onClick={() => i18n.changeLanguage('en')}>
                                English
                            </button>
                            <button onClick={() => i18n.changeLanguage('fil')}>
                                Filipino
                            </button>
                        </div>
    
                        <div className="submitted-form-card">
    
                            <div className="submitted-form-header">
                                <div className="submitted-check">✓</div>
    
                                <p>
                                    You have already completed your donor prescreening <form action="" method="post"></form>
                                    for today. Your submitted answers are shown below
                                    and can no longer be edited.
                                </p>
    
                                <div className="submitted-time">
                                    Submitted{' '}
                                    {new Date(
                                        todaySubmission.createdAt
                                    ).toLocaleString([], {
                                        dateStyle: 'medium',
                                        timeStyle: 'short',
                                    })}
                                </div>
                            </div>
    
                            <div className="submitted-answers">
                                {todaySubmission.answers?.map((answer, index) => {
                                    const displayAnswer =
                                        DATE_ONLY.includes(answer.qId)
                                            ? answer.date
                                                ? new Date(
                                                    answer.date
                                                ).toLocaleDateString()
                                                : '—'
                                            : answer.result === true
                                            ? 'Yes'
                                            : answer.result === false
                                            ? 'No'
                                            : '—';
    
                                    return (
                                        <div
                                            key={answer.qId}
                                            className="submitted-answer-row"
                                        >
                                            <div className="submitted-question">
                                                <span className="submitted-question-number">
                                                    {index + 1}
                                                </span>
    
                                                <div>
                                                    <Trans
                                                        i18nKey={`questionnaire.q${answer.qId}`}
                                                        components={{
                                                            bold: <strong />,
                                                        }}
                                                    />
    
                                                    {answer.remarks && (
                                                        <p className="submitted-remark">
                                                            Remarks: {answer.remarks}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>
    
                                            <div
                                                className={`submitted-answer-value ${
                                                    displayAnswer === 'Yes'
                                                        ? 'answer-yes'
                                                        : displayAnswer === 'No'
                                                        ? 'answer-no'
                                                        : ''
                                                }`}
                                            >
                                                {displayAnswer}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
    
                            {returnTo && (
                                <div className="submitted-form-actions">
                                    <button
                                        type="button"
                                        className="submit-btn"
                                        onClick={() => navigate(returnTo, {
                                            replace: true,
                                            state: appointmentDraft ? { appointmentDraft } : undefined,
                                        })}
                                    >
                                        Return to Appointment
                                    </button>
                                </div>
                            )}
    
                        </div>
                    </div>
                </main>
            </div>
        );
    }

    if (cooldown.status === 'loading') return <p>Checking donation eligibility…</p>;

    if (cooldown.status === 'blocked') {
    return (
        <Navigate
        to="/DonationCooldown"
        replace
        state={{
            returnTo: location.pathname,
            lastDonationDate: cooldown.lastDonationDate,
            nextEligibleDate: cooldown.nextEligibleDate,
        }}
        />
    );
    }

    if (cooldown.status === 'error') {
    return (
        <div className="dashboard-container">
        <main className="dashboard-content">
            <div className="content-card">
            <p className="form-message error-message" role="alert">
                {cooldown.error || 'Could not verify donation eligibility. Please try again later.'}
            </p>
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
            <div className="dashboard-container donor-theme ui-dashboard">
            {sidebar}
                
                <main className="dashboard-content">
                 {pageHeader}
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
                                onClick={() => navigate('/DonorDashboard')}
                            >
                                {t('common.continue', 'Return to Dashboard')}
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
        <div className="dashboard-container donor-theme ui-dashboard">
            {sidebar}

            <main className="dashboard-content">
            {pageHeader}
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

                            {/* Single Next / Submit button, disabled until answer is valid */}
                            <button
                                type="button"
                                className="submit-btn"
                                onClick={goNext}
                                disabled={!canProceed || submitting}
                            >
                                {isLastStep
                                    ? t('common.submit', 'Submit')
                                    : t('common.next', 'Next')}
                            </button>
                        </div>
                    </div>
                </div>
            </main>

            {/* ── NEW: Confirmation modal ── */}
            {showConfirm && (
                <div
                    className="confirm-overlay"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-title"
                    aria-describedby="confirm-desc"
                >
                    <div className="confirm-modal">
                        <h3 id="confirm-title">
                            {t('questionnaire.confirmTitle', 'Confirm your submission')}
                        </h3>
                        <p id="confirm-desc">
                            {t(
                                'questionnaire.confirmBody',
                                'Please confirm that all the information you have provided is true and accurate. Submitting false information may affect your eligibility to donate blood.'
                            )}
                        </p>
                        <p className="confirm-warning">
                            {t(
                                'questionnaire.confirmWarning',
                                'I hereby declare that the answers I have given are true and correct to the best of my knowledge.'
                            )}
                        </p>

                        <div className="confirm-actions">
                            <button
                                type="button"
                                className="back-btn"
                                onClick={handleCancelConfirm}
                                disabled={submitting}
                            >
                                {t('common.cancel', 'Cancel')}
                            </button>
                            <button
                                type="button"
                                className="submit-btn"
                                onClick={handleConfirmSubmit}
                                disabled={submitting}
                            >
                                {submitting
                                    ? t('common.submitting', 'Submitting…')
                                    : t('questionnaire.confirmSubmit', 'Yes, I confirm and submit')}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

export default BloodDonorForm;