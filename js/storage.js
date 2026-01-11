/**
 * Gestión de almacenamiento local con manejo de errores
 */

import { STORAGE_KEYS, THEMES } from './constants.js';
import { safeJsonParse } from './utils.js';

/**
 * Guarda los precios en localStorage
 * @param {Object} prices - Objeto de precios a guardar
 * @returns {boolean} - True si se guardó correctamente
 */
export function savePrices(prices) {
    try {
        localStorage.setItem(STORAGE_KEYS.PRICES, JSON.stringify(prices));
        return true;
    } catch (e) {
        console.error('Error guardando precios:', e);
        return false;
    }
}

/**
 * Carga los precios desde localStorage
 * @returns {{prices: Object|null, error: string|null}} - Precios cargados o error
 */
export function loadPricesFromStorage() {
    try {
        const stored = localStorage.getItem(STORAGE_KEYS.PRICES);
        if (!stored) {
            return { prices: null, error: null };
        }

        const { data, error } = safeJsonParse(stored);
        if (error) {
            // Si hay error, limpiar localStorage corrupto
            localStorage.removeItem(STORAGE_KEYS.PRICES);
            return { prices: null, error: 'Datos corruptos en almacenamiento local' };
        }

        return { prices: data, error: null };
    } catch (e) {
        console.error('Error cargando precios:', e);
        return { prices: null, error: e.message };
    }
}

/**
 * Carga los precios desde el archivo JSON
 * @returns {Promise<Object>} - Promesa con los precios
 */
export async function loadPricesFromFile() {
    const response = await fetch('prices.json');
    if (!response.ok) {
        throw new Error(`Error HTTP: ${response.status}`);
    }
    return response.json();
}

/**
 * Guarda la preferencia de tema
 * @param {string} theme - Tema a guardar ('light' o 'dark')
 */
export function saveTheme(theme) {
    try {
        localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (e) {
        console.error('Error guardando tema:', e);
    }
}

/**
 * Carga la preferencia de tema
 * @returns {string|null} - Tema guardado o null
 */
export function loadTheme() {
    try {
        return localStorage.getItem(STORAGE_KEYS.THEME);
    } catch (e) {
        console.error('Error cargando tema:', e);
        return null;
    }
}

/**
 * Detecta la preferencia de tema del sistema
 * @returns {string} - 'dark' o 'light'
 */
export function getSystemThemePreference() {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return THEMES.DARK;
    }
    return THEMES.LIGHT;
}

/**
 * Inicializa el tema basándose en localStorage o preferencia del sistema
 * @returns {string} - Tema aplicado
 */
export function initializeTheme() {
    const savedTheme = loadTheme();
    if (savedTheme) {
        return savedTheme;
    }
    return getSystemThemePreference();
}
