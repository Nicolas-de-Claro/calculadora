/**
 * Funcionalidades de UI: renderizado, animaciones y temas
 */

import { DOM_SELECTORS, THEMES, ANIMATION_DURATION } from './constants.js';
import { formatCurrency } from './utils.js';
import { saveTheme, initializeTheme } from './storage.js';

/**
 * Renderiza los ítems del desglose de precios
 * @param {Array} items - Array de ítems a mostrar
 */
export function renderBreakdown(items) {
    const container = document.querySelector(DOM_SELECTORS.PRICE_BREAKDOWN);
    const separator = document.querySelector(DOM_SELECTORS.TOTAL_SEPARATOR);
    container.innerHTML = '';

    const validItems = items.filter(item => item && item.value !== 0);

    if (validItems.length > 0) {
        validItems.forEach(item => {
            const div = document.createElement('div');
            div.className = 'breakdown-item';
            div.innerHTML = `
        <span class="label">${item.label}</span>
        <span class="value">${formatCurrency(item.value)}</span>
      `;
            container.appendChild(div);
        });
        separator.style.display = 'block';
    } else {
        separator.style.display = 'none';
    }
}

/**
 * Actualiza el precio total con animación de pulso
 * @param {number} price - Precio a mostrar
 */
export function updateTotalPrice(price) {
    const element = document.querySelector(DOM_SELECTORS.TOTAL_PRICE);
    const stickyElement = document.querySelector(DOM_SELECTORS.STICKY_PRICE);
    const previousPrice = element.textContent;
    const newPrice = formatCurrency(price);

    if (previousPrice !== newPrice) {
        element.textContent = newPrice;
        if (stickyElement) {
            stickyElement.textContent = newPrice;
        }
        animatePulse(element);
    }
}

/**
 * Aplica animación de pulso a un elemento
 * @param {HTMLElement} element - Elemento a animar
 */
export function animatePulse(element) {
    element.classList.remove('pulse-animation');
    // Force reflow
    void element.offsetWidth;
    element.classList.add('pulse-animation');
}

/**
 * Muestra un elemento con animación fade-in
 * @param {HTMLElement} element - Elemento a mostrar
 */
export function fadeIn(element) {
    element.classList.add('fade-in');
    element.style.display = '';
}

/**
 * Oculta un elemento con animación fade-out
 * @param {HTMLElement} element - Elemento a ocultar
 * @returns {Promise} - Promesa que se resuelve cuando termina la animación
 */
export function fadeOut(element) {
    return new Promise(resolve => {
        element.classList.add('fade-out');
        setTimeout(() => {
            element.remove();
            resolve();
        }, ANIMATION_DURATION.FADE);
    });
}

/**
 * Muestra el skeleton loading
 */
export function showLoading() {
    const priceElement = document.querySelector(DOM_SELECTORS.TOTAL_PRICE);
    priceElement.classList.add('skeleton');
    priceElement.textContent = '';
}

/**
 * Oculta el skeleton loading y el Splash Screen
 */
export function hideLoading() {
    const priceElement = document.querySelector(DOM_SELECTORS.TOTAL_PRICE);
    if(priceElement) priceElement.classList.remove('skeleton');
    
    const splash = document.getElementById('splash-screen');
    if (splash) {
        splash.style.opacity = '0';
        splash.style.visibility = 'hidden';
        setTimeout(() => splash.remove(), 500);
    }
}

/**
 * Muestra feedback temporal en un botón
 * @param {HTMLElement} button - Botón
 * @param {string} message - Mensaje a mostrar
 * @param {string} originalText - Texto original del botón
 */
export function showButtonFeedback(button, message, originalText = null) {
    const original = originalText || button.textContent;
    button.textContent = message;
    button.classList.add('success');

    setTimeout(() => {
        button.textContent = original;
        button.classList.remove('success');
    }, ANIMATION_DURATION.BUTTON_FEEDBACK);
}

// ========== Sistema de Temas ==========

/**
 * Aplica un tema al documento
 * @param {string} theme - Tema a aplicar ('light' o 'dark')
 */
export function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeToggleIcon(theme);
}

/**
 * Actualiza el icono del botón de tema
 * @param {string} theme - Tema actual
 */
function updateThemeToggleIcon(theme) {
    const btn = document.querySelector(DOM_SELECTORS.THEME_TOGGLE_BTN);
    if (btn) {
        btn.textContent = theme === THEMES.DARK ? '☀️' : '🌙';
        btn.setAttribute('aria-label',
            theme === THEMES.DARK ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'
        );
    }
}

/**
 * Alterna entre tema claro y oscuro
 */
export function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || THEMES.LIGHT;
    const newTheme = current === THEMES.DARK ? THEMES.LIGHT : THEMES.DARK;

    applyTheme(newTheme);
    saveTheme(newTheme);
}

/**
 * Inicializa el sistema de temas
 */
export function initThemeSystem() {
    const theme = initializeTheme();
    applyTheme(theme);

    // Listener para cambios en preferencia del sistema
    if (window.matchMedia) {
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            // Solo cambiar si no hay preferencia guardada
            const saved = localStorage.getItem('calculatorTheme');
            if (!saved) {
                applyTheme(e.matches ? THEMES.DARK : THEMES.LIGHT);
            }
        });
    }
}

/**
 * Inicializa las mejoras UX Thumb-Friendly
 */
export function initThumbFriendlyUX() {
    // 1. Manejo de Pill Buttons
    const pillGroups = document.querySelectorAll(DOM_SELECTORS.PILL_GROUP);
    
    pillGroups.forEach(group => {
        const targetSelector = group.getAttribute('data-target');
        const targetSelect = document.querySelector(targetSelector);
        const buttons = group.querySelectorAll(DOM_SELECTORS.PILL_BTN);
        
        // Initial state sync
        if (targetSelect) {
            const currentValue = targetSelect.value;
            buttons.forEach(btn => {
                if (btn.getAttribute('data-value') === currentValue) {
                    btn.classList.add('active');
                }
            });
        }

        buttons.forEach(btn => {
            btn.addEventListener('click', () => {
                const value = btn.getAttribute('data-value');
                
                // UI feedback
                buttons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Update hidden select and trigger change
                if (targetSelect) {
                    targetSelect.value = value;
                    targetSelect.dispatchEvent(new Event('change', { bubbles: true }));
                }
                
                // Vibration feedback if available
                if (window.navigator && window.navigator.vibrate) {
                    window.navigator.vibrate(5);
                }
            });
        });
    });

    // 2. Sticky Copy Button
    const stickyCopyBtn = document.querySelector(DOM_SELECTORS.STICKY_COPY_BTN);
    const mainCopyBtn = document.querySelector(DOM_SELECTORS.COPY_SUMMARY_BTN);
    
    if (stickyCopyBtn && mainCopyBtn) {
        stickyCopyBtn.addEventListener('click', () => {
            mainCopyBtn.click();
            showButtonFeedback(stickyCopyBtn, '✅ Copiado');
        });
    }

    // 3. Smart Sticky Visibility (Hide when .total-card is visible)
    const stickyBar = document.querySelector(DOM_SELECTORS.STICKY_TOTAL_BAR);
    const totalCard = document.querySelector('.total-card');

    if (stickyBar && totalCard) {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                // If totalCard is visible, hide stickyBar
                if (entry.isIntersecting) {
                    stickyBar.classList.add('sticky-hidden');
                } else {
                    stickyBar.classList.remove('sticky-hidden');
                }
            });
        }, {
            threshold: 0.1 // Trigger when at least 10% of totalCard is visible
        });

        observer.observe(totalCard);
    }
}

/**
 * Muestra un mensaje de error en la UI
 * @param {string} message - Mensaje de error
 */
export function showError(message) {
    const errorContainer = document.querySelector(DOM_SELECTORS.VALIDATION_ERROR);
    if (errorContainer) {
        errorContainer.textContent = `⚠️ ${message}`;
        errorContainer.style.display = 'block';
    }
}

/**
 * Oculta el mensaje de error
 */
export function hideError() {
    const errorContainer = document.querySelector(DOM_SELECTORS.VALIDATION_ERROR);
    if (errorContainer) {
        errorContainer.style.display = 'none';
        errorContainer.textContent = '';
    }
}
