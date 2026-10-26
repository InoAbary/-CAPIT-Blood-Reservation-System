function BSFGenerateReportModal({
    downloading,
    onDownload,
    onClose
}) {
    return (
        <div
            className="bu-modal-backdrop"
            onMouseDown={(event) => {
                if (
                    event.target === event.currentTarget &&
                    !downloading
                ) {
                    onClose();
                }
            }}
        >
            <div className="bu-generate-modal">
                <div className="bu-modal-header">
                    <div>
                        <div className="bu-modal-eyebrow">
                            Export
                        </div>

                        <div className="bu-modal-title">
                            Generate Report
                        </div>

                        <div className="bu-modal-description">
                            Select the format for your utilization report.
                        </div>
                    </div>

                    <button
                        type="button"
                        className="bu-close-button"
                        onClick={onClose}
                        disabled={downloading}
                        aria-label="Close report generator"
                    >
                        ×
                    </button>
                </div>

                <div className="bu-format-grid">
                    <button
                        type="button"
                        className="bu-format-option"
                        onClick={() => onDownload('pdf')}
                        disabled={downloading}
                    >
                        <span className="bu-format-title">
                            PDF Report
                        </span>

                        <span className="bu-format-description">
                            Portable document format
                        </span>
                    </button>

                    <button
                        type="button"
                        className="bu-format-option"
                        onClick={() => onDownload('csv')}
                        disabled={downloading}
                    >
                        <span className="bu-format-title">
                            CSV Export
                        </span>

                        <span className="bu-format-description">
                            Comma-separated values
                        </span>
                    </button>

                    <button
                        type="button"
                        className="bu-format-option bu-format-option--active"
                        onClick={() => onDownload('excel')}
                        disabled={downloading}
                    >
                        <span className="bu-format-title">
                            {downloading
                                ? 'Generating...'
                                : 'Excel Sheet'}
                        </span>

                        <span className="bu-format-description">
                            Spreadsheet with utilization data
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}

export default BSFGenerateReportModal;