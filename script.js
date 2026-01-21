/**
 * Calculadora de Precios - Módulo Principal
 * Refactorizado con ES6 modules, debounce y manejo de errores mejorado
 */

import { DOM_SELECTORS, DEBOUNCE_DELAY, ERROR_MESSAGES, ANIMATION_DURATION } from './js/constants.js';
import { debounce, formatCurrency } from './js/utils.js';
import { loadPricesFromFile } from './js/storage.js';
import {
  calculateInternetTvCost,
  calculateAbonoDiscount,
  calculateLineCost,
  calculatePackFutbol,
  calculateClaroPayCashback
} from './js/calculator.js';
import {
  renderBreakdown,
  updateTotalPrice,
  fadeIn,
  fadeOut,
  showLoading,
  hideLoading,
  initThemeSystem,
  toggleTheme,
  showButtonFeedback
} from './js/ui.js';
import { initConfigModal } from './js/config.js';
import { exportToPdf } from './js/pdf-export.js';
import { updateChart, toggleChartVisibility } from './js/chart.js';

// Estado global de la aplicación
let prices = {};
let configModalRef = null;
let chartVisible = false;

// ========== Inicialización ==========

document.addEventListener('DOMContentLoaded', async function () {
  showLoading();

  try {
    prices = await loadPricesFromFile();
    initializeApp();
  } catch (error) {
    console.error('Error crítico al inicializar:', error);
    document.querySelector(DOM_SELECTORS.TOTAL_PRICE).textContent = 'Error al cargar';
  }
});

/**
 * Inicializa la aplicación
 */
function initializeApp() {
  // Inicializar sistema de temas
  initThemeSystem();

  // Inicializar modal de configuración
  configModalRef = initConfigModal(prices, (newPrices) => {
    prices = newPrices;
    calculateTotalPriceDebounced();
  });

  // Inicializar tabs de navegación
  initTabs();

  // Cargar botones de carga de cliente
  loadCargaButtons();

  // Adjuntar event listeners
  attachEventListeners();

  // Calcular precio inicial
  hideLoading();
  calculateTotalPrice();
}

// ========== Cálculo de Precios ==========

/**
 * Calcula el precio total de todos los servicios
 */
function calculateTotalPrice() {
  if (Object.keys(prices).length === 0) {
    document.querySelector(DOM_SELECTORS.TOTAL_PRICE).textContent = ERROR_MESSAGES.LOADING_PRICES;
    return;
  }

  let subtotal = 0;
  const breakdownItems = [];

  // Internet y TV
  const bafType = document.querySelector(DOM_SELECTORS.BAF_TYPE).value;
  const internetSpeed = document.querySelector(DOM_SELECTORS.INTERNET_SPEED).value;
  const addTv = document.querySelector(DOM_SELECTORS.ADD_TV).value;

  const internetTvResult = calculateInternetTvCost(prices, bafType, internetSpeed, addTv);
  if (internetTvResult.price > 0) {
    subtotal += internetTvResult.price;
    breakdownItems.push(...internetTvResult.breakdown);
  }

  // Descuento Abono Claro
  const abonoValue = document.querySelector(DOM_SELECTORS.HAS_CLARO_ABONO).value;
  const abonoResult = calculateAbonoDiscount(prices, abonoValue);
  if (abonoResult.discount > 0) {
    subtotal -= abonoResult.discount;
    breakdownItems.push(abonoResult.breakdown);
  }

  // Pack Fútbol
  const packFutbolChecked = document.querySelector(DOM_SELECTORS.PACK_FUTBOL_CHECKBOX).checked;
  const packFutbolResult = calculatePackFutbol(prices, packFutbolChecked);
  if (packFutbolResult.price > 0) {
    subtotal += packFutbolResult.price;
    breakdownItems.push(packFutbolResult.breakdown);
  }

  // Líneas móviles
  const portSection = document.querySelector(DOM_SELECTORS.PORTABILITY_SECTION);
  const portCards = portSection.querySelectorAll(DOM_SELECTORS.PORTABILITY_CARD);

  portCards.forEach((card, index) => {
    const portaType = card.querySelector(DOM_SELECTORS.PORTA_TYPE).value;
    const operator = card.querySelector(DOM_SELECTORS.PORT_REQUEST).value;
    const dataAmount = card.querySelector(DOM_SELECTORS.DATA_AMOUNT).value;
    const extraPack = card.querySelector(DOM_SELECTORS.EXTRA_PACK).value;

    const lineResult = calculateLineCost(prices, portaType, operator, dataAmount, extraPack, index);
    if (lineResult.price > 0) {
      subtotal += lineResult.price;
      breakdownItems.push(lineResult.breakdown);
    }
  });

  // Cashback Claro Pay
  const claroPayChecked = document.querySelector(DOM_SELECTORS.CLARO_PAY_CHECKBOX).checked;
  const claroPayResult = calculateClaroPayCashback(prices, subtotal, claroPayChecked);
  if (claroPayResult.cashback > 0) {
    subtotal -= claroPayResult.cashback;
    breakdownItems.push(claroPayResult.breakdown);
  }

  // Actualizar UI
  renderBreakdown(breakdownItems);
  updateTotalPrice(subtotal);

  // Actualizar gráfico si está visible
  if (chartVisible) {
    updateChart(breakdownItems);
  }
}

// Versión debounced del cálculo
const calculateTotalPriceDebounced = debounce(calculateTotalPrice, DEBOUNCE_DELAY);

// ========== Event Listeners ==========

function attachEventListeners() {
  // Selectores principales
  const mainSelectors = [
    DOM_SELECTORS.BAF_TYPE,
    DOM_SELECTORS.INTERNET_SPEED,
    DOM_SELECTORS.ADD_TV,
    DOM_SELECTORS.HAS_CLARO_ABONO
  ];

  mainSelectors.forEach(selector => {
    document.querySelector(selector)?.addEventListener('change', calculateTotalPriceDebounced);
  });

  // Checkboxes
  document.querySelector(DOM_SELECTORS.PACK_FUTBOL_CHECKBOX)?.addEventListener('change', calculateTotalPriceDebounced);
  document.querySelector(DOM_SELECTORS.CLARO_PAY_CHECKBOX)?.addEventListener('change', calculateTotalPriceDebounced);

  // Añadir línea móvil
  document.querySelector(DOM_SELECTORS.ADD_LINE_BTN)?.addEventListener('click', () => addPortabilitySection(false));

  // Delegación de eventos para líneas móviles
  document.querySelector(DOM_SELECTORS.PORTABILITY_SECTION)?.addEventListener('change', (event) => {
    if (event.target.matches('.port-request, .data-amount, .porta-type, .extra-pack')) {
      calculateTotalPriceDebounced();
    }
  });

  // Copiar resumen
  document.querySelector(DOM_SELECTORS.COPY_SUMMARY_BTN)?.addEventListener('click', copySummary);

  // Toggle de tema
  document.querySelector(DOM_SELECTORS.THEME_TOGGLE_BTN)?.addEventListener('click', toggleTheme);

  // Exportar a PDF
  document.getElementById('export-pdf-btn')?.addEventListener('click', exportToPdf);

  // Toggle gráfico
  document.getElementById('toggle-chart-btn')?.addEventListener('click', toggleChartView);
}

// ========== Navegación por Tabs ==========

function initTabs() {
  const tabButtons = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');
  const pageTitle = document.getElementById('page-title');

  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.dataset.tab;

      // Actualizar botones
      tabButtons.forEach(b => {
        b.classList.remove('active');
        b.setAttribute('aria-selected', 'false');
      });
      btn.classList.add('active');
      btn.setAttribute('aria-selected', 'true');

      // Actualizar contenido
      tabContents.forEach(content => {
        const isTarget = content.id === `tab-${targetTab}`;
        content.classList.toggle('active', isTarget);
        content.hidden = !isTarget;
      });

      // Actualizar título de la página
      if (targetTab === 'calculadora') {
        pageTitle.textContent = 'Calculadora de Precios';
      } else if (targetTab === 'carga') {
        pageTitle.textContent = 'Carga de Cliente';
      }
    });
  });
}

// ========== Carga de Botones Dinámicos ==========

async function loadCargaButtons() {
  try {
    const response = await fetch('links.json');
    if (!response.ok) throw new Error('No se pudo cargar links.json');

    const data = await response.json();
    const container = document.getElementById('carga-buttons');

    if (!container || !data.cargaCliente) return;

    container.innerHTML = '';

    data.cargaCliente.forEach(item => {
      const link = document.createElement('a');
      link.href = item.url;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'carga-link-btn';
      link.id = item.id;

      link.innerHTML = `
        <span class="carga-link-icon" style="background-color: ${item.color}20; color: ${item.color}">
          ${item.icono}
        </span>
        <div class="carga-link-content">
          <span class="carga-link-title">${item.nombre}</span>
          <span class="carga-link-desc">${item.descripcion}</span>
        </div>
        <span class="carga-link-arrow">→</span>
      `;

      container.appendChild(link);
    });
  } catch (error) {
    console.error('Error cargando botones de carga:', error);
  }
}


// ========== Gestión de Líneas Móviles ==========

function addPortabilitySection(isInitial = false) {
  const container = document.querySelector(DOM_SELECTORS.PORTABILITY_SECTION);
  const card = document.createElement('div');
  card.className = 'card portability fade-in';

  card.innerHTML = `
    <div class="card-title-container">
      <h2 class="card-title">Línea Móvil</h2>
      ${!isInitial ? '<button class="remove-line-btn" aria-label="Quitar línea móvil">Quitar</button>' : ''}
    </div>
    <div class="option">
      <label id="porta-type-label">Tipo de Línea</label>
      <select class="porta-type" aria-labelledby="porta-type-label">
        <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
        <option value="CORPORATIVO">Corporativo</option>
      </select>
    </div>
    <div class="option">
      <label id="operator-label">Operador</label>
      <select class="port-request" aria-labelledby="operator-label">
        <option value="no">No incluir</option>
        <option value="linea_nueva">Línea Nueva</option>
        <option value="personal">Personal</option>
        <option value="movistar">Movistar</option>
        <option value="tuenti">Tuenti</option>
        <option value="convergente">Convergente</option>
      </select>
    </div>
    <div class="option">
      <label id="data-label">Gigas</label>
      <select class="data-amount" aria-labelledby="data-label">
        <option value="no">No incluir</option>
        <option value="2">2 GB</option>
        <option value="4">4 GB</option>
        <option value="7">7 GB</option>
        <option value="10">10 GB</option>
        <option value="20">20 GB</option>
        <option value="30">30 GB</option>
      </select>
    </div>
    <div class="option">
      <label id="pack-label">Pack Adicional</label>
      <select class="extra-pack" aria-labelledby="pack-label">
        <option value="no">Ninguno</option>
        <option value="PACK_10_GB">Pack 10 GB</option>
        <option value="PACK_15_GB">Pack 15 GB</option>
      </select>
    </div>
  `;

  container.appendChild(card);

  if (!isInitial) {
    card.querySelector('.remove-line-btn')?.addEventListener('click', () => removePortabilitySection(card));
  }

  updateClaroAbonoSelection();
  calculateTotalPriceDebounced();
}

async function removePortabilitySection(cardElement) {
  await fadeOut(cardElement);
  updateClaroAbonoSelection();
  calculateTotalPriceDebounced();
}

function updateClaroAbonoSelection() {
  const container = document.querySelector(DOM_SELECTORS.PORTABILITY_SECTION);
  const activeLines = container.querySelectorAll(DOM_SELECTORS.PORTABILITY_CARD).length;
  const abonoSelect = document.querySelector(DOM_SELECTORS.HAS_CLARO_ABONO);

  if (activeLines === 0) {
    abonoSelect.value = 'no';
  } else if (activeLines === 1) {
    abonoSelect.value = '1';
  } else {
    abonoSelect.value = '2';
  }
}

// ========== Copiar Resumen ==========

function copySummary() {
  const breakdownItems = document.querySelectorAll('#price-breakdown .breakdown-item');
  let text = '*Resumen del Plan*\n\n';

  breakdownItems.forEach(item => {
    const label = item.querySelector('.label').innerText;
    const value = item.querySelector('.value').innerText;
    text += `- *${label}*: ${value}\n`;
  });

  const total = document.querySelector(DOM_SELECTORS.TOTAL_PRICE).innerText;
  text += `\n*Total Mensual: ${total}*`;

  navigator.clipboard.writeText(text)
    .then(() => {
      const btn = document.querySelector(DOM_SELECTORS.COPY_SUMMARY_BTN);
      showButtonFeedback(btn, '¡Copiado!', '📋 Copiar');
    })
    .catch(err => {
      console.error('Error al copiar:', err);
      alert(ERROR_MESSAGES.COPY_ERROR);
    });
}

// ========== Chart Toggle ==========

function toggleChartView() {
  chartVisible = !chartVisible;
  toggleChartVisibility(chartVisible);

  const btn = document.getElementById('toggle-chart-btn');
  btn.textContent = chartVisible ? '📊 Ocultar' : '📊 Gráfico';

  if (chartVisible) {
    // Obtener breakdown items actual
    const breakdownItems = [];
    document.querySelectorAll('#price-breakdown .breakdown-item').forEach(item => {
      const label = item.querySelector('.label').textContent;
      const valueText = item.querySelector('.value').textContent;
      const value = parseFloat(valueText.replace(/[$.]/g, '').replace(',', '.'));
      if (value > 0) {
        breakdownItems.push({ label, value });
      }
    });
    updateChart(breakdownItems);
  }
}
