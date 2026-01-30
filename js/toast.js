/**
 * Toast Notifications Module
 * Lightweight toast notifications to replace alert()
 */

const TOAST_DURATION = 3000;
const TOAST_CONTAINER_ID = 'toast-container';

/**
 * Shows a toast notification
 * @param {string} message - Message to display
 * @param {string} type - Type: 'success', 'error', 'info'
 */
export function showToast(message, type = 'info') {
    let container = document.getElementById(TOAST_CONTAINER_ID);

    if (!container) {
        container = document.createElement('div');
        container.id = TOAST_CONTAINER_ID;
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;

    container.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('toast-visible');
    });

    // Auto-remove
    setTimeout(() => {
        toast.classList.remove('toast-visible');
        toast.addEventListener('transitionend', () => toast.remove());
    }, TOAST_DURATION);
}

/**
 * Shows a success toast
 * @param {string} message 
 */
export function showSuccess(message) {
    showToast(message, 'success');
}

/**
 * Shows an error toast
 * @param {string} message 
 */
export function showError(message) {
    showToast(message, 'error');
}

/**
 * Shows an info toast
 * @param {string} message 
 */
export function showInfo(message) {
    showToast(message, 'info');
}
