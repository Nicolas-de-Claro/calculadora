/**
 * Modal de configuración y gestión del editor JSON
 */

import { DOM_SELECTORS, ERROR_MESSAGES } from './constants.js';
import { validatePricesStructure, safeJsonParse } from './utils.js';
import { showError, hideError } from './ui.js';
import { showInfo } from './toast.js';

/**
 * Abre el modal de configuración
 * @param {Object} prices - Precios actuales para mostrar
 */
export function openConfigModal(prices) {
    const modal = document.querySelector(DOM_SELECTORS.CONFIG_MODAL);
    const editor = document.querySelector(DOM_SELECTORS.JSON_EDITOR);

    hideError();
    editor.style.borderColor = '';

    // Asegurar que prices es un objeto
    let pricesObj = prices;
    if (typeof prices === 'string') {
        const { data } = safeJsonParse(prices);
        pricesObj = data || {};
    }

    editor.value = JSON.stringify(pricesObj, null, 2);
    modal.style.display = 'block';
}

/**
 * Cierra el modal de configuración
 */
export function closeConfigModal() {
    const modal = document.querySelector(DOM_SELECTORS.CONFIG_MODAL);
    modal.style.display = 'none';
}

/**
 * Formatea el contenido del editor JSON
 */
export function formatJsonEditor() {
    const editor = document.querySelector(DOM_SELECTORS.JSON_EDITOR);
    const { data, error } = safeJsonParse(editor.value);

    if (error) {
        showError(ERROR_MESSAGES.JSON_FORMAT_ERROR);
        return;
    }

    editor.value = JSON.stringify(data, null, 2);
    hideError();
}

/**
 * Guarda la configuración del editor JSON (solo en memoria, no en localStorage)
 * @param {Function} onSuccess - Callback cuando se guarda exitosamente
 * @returns {{success: boolean, prices: Object|null, error: string|null}}
 */
export function saveConfigFromEditor(onSuccess) {
    const editor = document.querySelector(DOM_SELECTORS.JSON_EDITOR);

    hideError();
    editor.style.borderColor = '';

    // Parsear JSON
    const { data: newPrices, error: parseError } = safeJsonParse(editor.value);

    if (parseError) {
        showError(`Error en JSON: ${parseError}`);
        editor.style.borderColor = '#c62828';
        scrollModalToTop();
        return { success: false, prices: null, error: parseError };
    }

    // Validar estructura
    const { isValid, error: validationError } = validatePricesStructure(newPrices);

    if (!isValid) {
        showError(validationError);
        editor.style.borderColor = '#c62828';
        scrollModalToTop();
        return { success: false, prices: null, error: validationError };
    }

    // Éxito - aplicar cambios solo en memoria
    closeConfigModal();

    if (onSuccess) {
        onSuccess(newPrices);
    }

    return { success: true, prices: newPrices, error: null };
}

/**
 * Hace scroll al inicio del modal para mostrar errores
 */
function scrollModalToTop() {
    const modalContent = document.querySelector('.modal-content');
    if (modalContent) {
        modalContent.scrollTop = 0;
    }
}

/**
 * Inicializa los event listeners del modal
 * @param {Object} prices - Precios actuales
 * @param {Function} onPricesUpdate - Callback cuando se actualizan precios
 */
export function initConfigModal(prices, onPricesUpdate) {
    const configBtn = document.querySelector(DOM_SELECTORS.CONFIG_BTN);
    const closeBtn = document.querySelector(DOM_SELECTORS.CLOSE_MODAL_BTN);
    const saveBtn = document.querySelector(DOM_SELECTORS.SAVE_CONFIG_BTN);
    const formatBtn = document.querySelector(DOM_SELECTORS.FORMAT_JSON_BTN);
    const modal = document.querySelector(DOM_SELECTORS.CONFIG_MODAL);

    // Almacenar referencia a precios actuales
    let currentPrices = prices;

    configBtn?.addEventListener('click', () => openConfigModal(currentPrices));
    closeBtn?.addEventListener('click', closeConfigModal);
    formatBtn?.addEventListener('click', formatJsonEditor);

    saveBtn?.addEventListener('click', () => {
        const result = saveConfigFromEditor((newPrices) => {
            currentPrices = newPrices;
            if (onPricesUpdate) {
                onPricesUpdate(newPrices);
            }
            showInfo('Precios actualizados (temporalmente)');
        });
    });

    // Cerrar modal al hacer clic fuera
    window.addEventListener('click', (event) => {
        if (event.target === modal) {
            closeConfigModal();
        }
    });

    // Actualizar referencia de precios
    return {
        updatePrices: (newPrices) => {
            currentPrices = newPrices;
        }
    };
}
