import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation, Trans } from 'react-i18next';
import '../styles/FormResult.css';


function FormPending() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const { state } = useLocation();

    const DATE_ONLY = [34, 37];
    

    const answers = state?.answers || [];
    const donorName = state?.donorName || '';
    const submittedAt = state?.submittedAt
        ? new Date(state.submittedAt).toLocaleString()
        : new Date().toLocaleString();

    const handlePrint = () => window.print();

    return (
        <div className="formresult-container formresult-pending">
            <h3>
                Your blood donation request form has been submitted. Please visit your
                nearest Philippine Red Cross branch for further screening procedures.
            </h3>

            {/* Show buttons only if we actually have answers to print */}
            {answers.length > 0 && (
                <div className="formresult-actions no-print">
                    <button className="submit-btn" onClick={handlePrint}>
                        {t('common.print', 'Print a Copy of My Answers')}
                    </button>
                    <button
                        className="back-btn"
                        onClick={() => navigate('/DonorDashboard')}
                    >
                        {t('common.back', 'Return to Dashboard')}
                    </button>
                </div>
            )}

            {/* Hidden on screen, visible only when printing */}
            {answers.length > 0 && (
                <div className="print-only">
                    <h2>
                        {t(
                            'questionnaire.printTitle',
                            'Blood Donation Questionnaire – My Answers'
                        )}
                    </h2>
                    <p>
                        <strong>{t('common.donor', 'Donor')}:</strong> {donorName || '—'}
                        <br />
                        <strong>{t('common.submitted', 'Submitted')}:</strong> {submittedAt}
                    </p>

                    <table className="answers-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>{t('common.question', 'Question')}</th>
                                <th>{t('common.answer', 'Answer')}</th>
                                <th>{t('common.remarks', 'Remarks')}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {answers.map((a) => {
                                const isDate = DATE_ONLY.includes(a.id);
                                const value = isDate
                                    ? a.date
                                        ? new Date(a.date).toLocaleDateString()
                                        : '—'
                                    : a.answer === 'yes'
                                    ? t('common.yes', 'Yes')
                                    : a.answer === 'no'
                                    ? t('common.no', 'No')
                                    : '—';

                                return (
                                    <tr key={a.id}>
                                        <td>{a.id}</td>
                                        <td>
                                            <Trans i18nKey={`questionnaire.q${a.id}`} 
                                                components={{ bold: <strong /> }}
                                            
                                            />
                                        </td>
                                        <td>{value}</td>
                                        <td>{a.remark || ''}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default FormPending;