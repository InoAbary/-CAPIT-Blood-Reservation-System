import { useEffect, useId, useRef } from 'react';
import { CheckCircleIcon, ExclamationCircleIcon } from '@heroicons/react/24/outline';
import '../styles/UI.css';

export default function ResultModal({ type, title, message, children, onClose }) {
  const dialogRef = useRef(null);
  const titleId = useId();
  const messageId = useId();
  const Icon = type === 'success' ? CheckCircleIcon : ExclamationCircleIcon;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      className="ui-result-modal"
      data-type={type}
      aria-labelledby={titleId}
      aria-describedby={messageId}
      onClose={onClose}
    >
      <Icon className="ui-result-modal__icon" aria-hidden="true" />
      <h2 id={titleId}>{title}</h2>
      <p id={messageId}>{message}</p>
      {children}
      <div className="ui-result-modal__actions">
        <button type="button" onClick={() => dialogRef.current.close()}>OK</button>
      </div>
    </dialog>
  );
}
