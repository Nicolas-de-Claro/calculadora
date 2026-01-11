/**
 * Lógica de cálculo de precios (sin dependencias del DOM)
 */

/**
 * Calcula el costo combinado de Internet y TV
 * @param {Object} prices - Objeto de precios
 * @param {string} bafType - Tipo de plan BAF
 * @param {string} internetSpeed - Velocidad de Internet
 * @param {string} tvDecos - Número de decodificadores
 * @returns {{price: number, breakdown: Array}} - Precio y desglose
 */
export function calculateInternetTvCost(prices, bafType, internetSpeed, tvDecos) {
    let price = 0;
    const breakdown = [];

    if (prices.BAF[bafType]?.internet?.[internetSpeed]) {
        const internetPrice = prices.BAF[bafType].internet[internetSpeed];
        price += internetPrice;
        breakdown.push({
            label: `Internet ${internetSpeed}MB + Línea Fija`,
            value: internetPrice
        });
    }

    if (prices.BAF[bafType]?.tv?.[tvDecos]) {
        const tvPrice = prices.BAF[bafType].tv[tvDecos];
        price += tvPrice;
        breakdown.push({
            label: `TV (${tvDecos} Deco/s)`,
            value: tvPrice
        });
    }

    return { price, breakdown };
}

/**
 * Calcula el descuento por Abono Claro
 * @param {Object} prices - Objeto de precios
 * @param {string} abonoValue - Valor del abono ('1', '2', o 'no')
 * @returns {{discount: number, breakdown: Object|null}} - Descuento y desglose
 */
export function calculateAbonoDiscount(prices, abonoValue) {
    let discount = 0;
    let breakdown = null;

    if (prices.CLARO_ABONO_DISCOUNTS?.[abonoValue]) {
        discount = prices.CLARO_ABONO_DISCOUNTS[abonoValue];
        breakdown = { label: 'Descuento Abono', value: -discount };
    }

    return { discount, breakdown };
}

/**
 * Calcula el costo de una línea móvil
 * @param {Object} prices - Objeto de precios
 * @param {string} portaType - Tipo de porta (CONSUMIDOR_FINAL, CORPORATIVO)
 * @param {string} operator - Operador (personal, movistar, etc.)
 * @param {string} dataAmount - Cantidad de GB
 * @param {string} extraPack - Pack adicional
 * @param {number} lineIndex - Índice de la línea
 * @returns {{price: number, breakdown: Object}} - Precio y desglose
 */
export function calculateLineCost(prices, portaType, operator, dataAmount, extraPack, lineIndex) {
    let price = 0;
    let label = `Línea ${lineIndex + 1}`;

    // Costo base de la línea
    if (prices.PORTA[portaType]?.[operator]?.[dataAmount]) {
        price += prices.PORTA[portaType][operator][dataAmount];
        label += ` (${dataAmount}GB)`;
    }

    // Pack adicional
    if (prices.ADICIONALES?.[extraPack] && extraPack !== 'no') {
        price += prices.ADICIONALES[extraPack];
        label += ' + Pack';
    }

    return { price, breakdown: { label, value: price } };
}

/**
 * Calcula el costo del Pack Fútbol
 * @param {Object} prices - Objeto de precios
 * @param {boolean} isSelected - Si está seleccionado
 * @returns {{price: number, breakdown: Object|null}} - Precio y desglose
 */
export function calculatePackFutbol(prices, isSelected) {
    if (!isSelected || !prices.ADICIONALES?.PACK_FUTBOL) {
        return { price: 0, breakdown: null };
    }

    const price = prices.ADICIONALES.PACK_FUTBOL;
    return {
        price,
        breakdown: { label: 'Pack Fútbol', value: price }
    };
}

/**
 * Calcula el cashback de Claro Pay
 * @param {Object} prices - Objeto de precios
 * @param {number} subtotal - Subtotal actual
 * @param {boolean} isEnabled - Si está habilitado
 * @returns {{cashback: number, breakdown: Object|null}} - Cashback y desglose
 */
export function calculateClaroPayCashback(prices, subtotal, isEnabled) {
    if (!isEnabled || !prices.CLARO_PAY) {
        return { cashback: 0, breakdown: null };
    }

    const calculated = subtotal * prices.CLARO_PAY.CASHBACK_PERCENTAGE;
    const cashback = Math.min(calculated, prices.CLARO_PAY.CASHBACK_CAP);

    if (cashback <= 0) {
        return { cashback: 0, breakdown: null };
    }

    return {
        cashback,
        breakdown: { label: 'Cashback Claro Pay', value: -cashback }
    };
}
