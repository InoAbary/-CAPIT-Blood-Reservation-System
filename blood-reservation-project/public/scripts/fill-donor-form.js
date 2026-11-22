// Synthetic data for local development only. Never use for real donor screening.
/*
 * run with
 *
 const { fillDonorForm *} = await import('/scripts/fill-donor-form.js');
 await fillDonorForm();
 */
export async function fillDonorForm({ answers = {}, dates = {} } = {}) {
    if (!['localhost', '127.0.0.1', '[::1]'].includes(location.hostname)) {
        throw new Error('Donor form test autofill is restricted to localhost.');
    }
    if (window.__donorAutofillRunning) {
        throw new Error('Donor autofill is already running.');
    }

    const pause = () => new Promise(resolve => setTimeout(resolve, 50));
    const waitFor = async (read, description) => {
        for (let attempt = 0; attempt < 100; attempt++) {
            const result = read();
            if (result) return result;
            if (document.querySelector('.donorform-rejected')) {
                throw new Error('The form rejected this sample answer. Autofill stopped.');
            }
            await pause();
        }
        throw new Error(`Timed out waiting for ${description}. Open the donor questionnaire and try again.`);
    };

    window.__donorAutofillRunning = true;
    try {
        for (let count = 0; count < 37; count++) {
            const form = await waitFor(() => document.querySelector('.donor-form'), 'the donor form');
            if (document.querySelector('.confirm-overlay')) {
                throw new Error('Close the submission confirmation before running autofill.');
            }
            const progress = form.querySelector('.progress-label')?.textContent.trim();
            const match = progress?.match(/^(\d+)\s*\/\s*(\d+)$/);
            if (!match) throw new Error('Could not read the donor form progress.');

            const radio = form.querySelector('input[type="radio"]');
            if (radio) {
                const id = Number(radio.name.replace('q-', ''));
                const value = answers[id] ?? (id === 1 ? 'yes' : 'no');
                if (!['yes', 'no'].includes(value)) throw new Error(`Invalid sample answer for question ${id}.`);
                form.querySelector(`input[name="q-${id}"][value="${value}"]`).click();
            } else {
                const input = form.querySelector('input[type="date"]');
                if (!input) throw new Error('Could not find an answer input.');
                // Questions 34 and 37 are the only date fields, in this order.
                const id = Number(match[1]) === 34 ? 34 : 37;
                const value = dates[id] ?? '2020-01-01';
                Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set.call(input, value);
                input.dispatchEvent(new Event('input', { bubbles: true }));
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }

            const next = await waitFor(() => {
                const button = document.querySelector('.donor-form .donorform-actions .submit-btn');
                return button && !button.disabled && button;
            }, 'the enabled Next button');
            // Never click Submit or confirm the truthfulness declaration.
            if (match[1] === match[2]) {
                console.info('Sample donor answers filled. Review them with Back; submission remains manual.');
                return;
            }
            next.click();
            await waitFor(() => {
                const label = document.querySelector('.donor-form .progress-label');
                return label && label.textContent.trim() !== progress;
            }, 'the next question');
        }
        throw new Error('Autofill stopped after reaching the question limit.');
    } finally {
        delete window.__donorAutofillRunning;
    }
}
