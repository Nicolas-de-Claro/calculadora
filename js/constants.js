/**
 * Constantes centralizadas para la aplicación
 */

// Selectores del DOM
export const DOM_SELECTORS = {
    // Elementos principales
    INTERNET_SPEED: '#internet-speed',
    ADD_TV: '#add-tv',
    BAF_TYPE: '#baf-type',
    TOTAL_PRICE: '#total-price',
    PORTABILITY_SECTION: '#portability-section',
    ADD_LINE_BTN: '#add-line-btn',
    PRICE_BREAKDOWN: '#price-breakdown',
    TOTAL_SEPARATOR: '.total-separator',

    // Beneficios
    HAS_CLARO_ABONO: '#has-claro-abono',
    CLARO_PAY_CHECKBOX: '#claro-pay-checkbox',
    PACK_FUTBOL_CHECKBOX: '#pack-futbol-checkbox',

    // Modal de configuración
    CONFIG_BTN: '#config-btn',
    CONFIG_MODAL: '#config-modal',
    CLOSE_MODAL_BTN: '.close-btn',
    SAVE_CONFIG_BTN: '#save-config-btn',
    JSON_EDITOR: '#json-editor',
    FORMAT_JSON_BTN: '#format-json-btn',
    VALIDATION_ERROR: '#validation-error',

    // Botones
    COPY_SUMMARY_BTN: '#copy-summary-btn',
    THEME_TOGGLE_BTN: '#theme-toggle-btn',

    // Líneas móviles (clases)
    PORTABILITY_CARD: '.portability',
    PORTA_TYPE: '.porta-type',
    PORT_REQUEST: '.port-request',
    DATA_AMOUNT: '.data-amount',
    EXTRA_PACK: '.extra-pack',
    REMOVE_LINE_BTN: '.remove-line-btn'
};

// Claves de localStorage
export const STORAGE_KEYS = {
    THEME: 'calculatorTheme'
};

// Configuración de debounce
export const DEBOUNCE_DELAY = 150; // ms

// Temas disponibles
export const THEMES = {
    LIGHT: 'light',
    DARK: 'dark'
};

// Mensajes de error
export const ERROR_MESSAGES = {
    INVALID_JSON: 'El contenido debe ser un objeto JSON válido.',
    MISSING_BAF: 'Falta la sección "BAF" en la configuración.',
    MISSING_PORTA: 'Falta la sección "PORTA" en la configuración.',
    MISSING_ADICIONALES: 'Falta la sección "ADICIONALES" en la configuración.',
    LOADING_PRICES: 'Cargando precios...',
    COPY_ERROR: 'No se pudo copiar al portapapeles',
    JSON_FORMAT_ERROR: 'No se puede formatear porque el JSON tiene errores.',
    PRICES_UPDATED: 'Precios actualizados correctamente.'
};

// Estructura esperada del JSON de precios
export const REQUIRED_PRICE_KEYS = ['BAF', 'PORTA', 'ADICIONALES', 'CLARO_ABONO_DISCOUNTS', 'CLARO_PAY'];

// Duración de animaciones (ms)
export const ANIMATION_DURATION = {
    FADE: 300,
    PULSE: 600,
    BUTTON_FEEDBACK: 2000
};
