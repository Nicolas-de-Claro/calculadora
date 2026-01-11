/**
 * Utilidades generales de la aplicación
 */

import { REQUIRED_PRICE_KEYS, ERROR_MESSAGES } from './constants.js';

/**
 * Crea una función debounced que retrasa la ejecución
 * @param {Function} func - Función a ejecutar
 * @param {number} wait - Tiempo de espera en ms
 * @returns {Function} - Función debounced
 */
export function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Formatea un valor numérico a formato de moneda argentina
 * @param {number} value - El valor numérico a formatear
 * @returns {string} - El valor formateado como cadena de moneda
 */
export function formatCurrency(value) {
    return new Intl.NumberFormat('es-AR', {
        style: 'currency',
        currency: 'ARS',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value);
}

/**
 * Valida que el objeto de precios tenga la estructura correcta
 * @param {Object} prices - Objeto de precios a validar
 * @returns {{isValid: boolean, error: string|null}} - Resultado de validación
 */
export function validatePricesStructure(prices) {
    if (!prices || typeof prices !== 'object') {
        return { isValid: false, error: ERROR_MESSAGES.INVALID_JSON };
    }

    for (const key of REQUIRED_PRICE_KEYS) {
        if (!(key in prices)) {
            return {
                isValid: false,
                error: `Falta la sección "${key}" en la configuración.`
            };
        }
    }

    // Validar estructura de BAF
    if (!prices.BAF.RESIDENCIAL || !prices.BAF.IP_DINAMICA || !prices.BAF.IP_FIJA) {
        return {
            isValid: false,
            error: 'La sección "BAF" debe contener RESIDENCIAL, IP_DINAMICA e IP_FIJA.'
        };
    }

    // Validar estructura de PORTA
    if (!prices.PORTA.CONSUMIDOR_FINAL || !prices.PORTA.CORPORATIVO) {
        return {
            isValid: false,
            error: 'La sección "PORTA" debe contener CONSUMIDOR_FINAL y CORPORATIVO.'
        };
    }

    // Validar CLARO_PAY
    if (typeof prices.CLARO_PAY.CASHBACK_PERCENTAGE !== 'number' ||
        typeof prices.CLARO_PAY.CASHBACK_CAP !== 'number') {
        return {
            isValid: false,
            error: 'CLARO_PAY debe tener CASHBACK_PERCENTAGE y CASHBACK_CAP numéricos.'
        };
    }

    return { isValid: true, error: null };
}

/**
 * Parsea JSON de forma segura
 * @param {string} jsonString - String JSON a parsear
 * @returns {{data: Object|null, error: string|null}} - Resultado del parseo
 */
export function safeJsonParse(jsonString) {
    try {
        const data = JSON.parse(jsonString);
        return { data, error: null };
    } catch (e) {
        return { data: null, error: e.message };
    }
}
