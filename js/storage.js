/**
 * Gestión de almacenamiento local con manejo de errores
 */

import { STORAGE_KEYS, THEMES } from './constants.js';

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
