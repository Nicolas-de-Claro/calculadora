/**
 * Claro Asesor - Módulo Principal
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
  showButtonFeedback,
  initThumbFriendlyUX
} from './js/ui.js';
import { initConfigModal } from './js/config.js';
import { exportToPdf } from './js/pdf-export.js';
import { updateChart, toggleChartVisibility } from './js/chart.js';
import { showError, showSuccess } from './js/toast.js';

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

  // Inicializar mejoras UX Thumb-Friendly
  initThumbFriendlyUX();

  // Cargar botones de carga de cliente
  loadCargaButtons();

  // Cargar botones de herramientas
  loadHerramientasButtons();

  // Cargar botones de CRM
  loadCrmButtons();

  // Adjuntar event listeners
  attachEventListeners();

  // Calcular precio inicial
  hideLoading();
  calculateTotalPrice();

  // Asegurar estado inicial correcto (Herramientas por defecto)
  updatePageTitle('herramientas');
  updateStickyBarVisibility();
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

  // Ordenar breakdownItems: según prioridad específica y descuentos al final
  breakdownItems.sort((a, b) => {
    // Si uno es descuento y el otro no, el descuento va al final
    if (a.value < 0 && b.value >= 0) return 1;
    if (a.value >= 0 && b.value < 0) return -1;

    // Si ambos son descuentos, mantener el orden por valor (más negativo al final)
    if (a.value < 0 && b.value < 0) return b.value - a.value;

    // Si ambos son positivos, aplicar pesos por tipo de servicio
    const getWeight = (item) => {
      if (item.label.includes('Internet')) return 1;
      if (item.label.includes('TV')) return 2;
      if (item.label.includes('Línea')) return 3;
      if (item.label.includes('Pack Fútbol')) return 4;
      return 5;
    };

    return getWeight(a) - getWeight(b);
  });

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
      if (event.target.matches('.port-request')) {
        updateDataGigasLabels(event.target);
      }
      calculateTotalPriceDebounced();
    }
  });

  // Copiar resumen
  document.querySelector(DOM_SELECTORS.COPY_SUMMARY_BTN)?.addEventListener('click', copySummary);

  // Compartir resumen (Nativo)
  const shareBtn = document.getElementById('share-summary-btn');
  if (shareBtn && navigator.share) {
    shareBtn.style.display = 'inline-flex'; // Mostrar solo si es soportado
    shareBtn.addEventListener('click', shareSummary);
  }

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

      // Al cambiar de tab principal, siempre ocultar paneles internos
      hideInternalPanels();

      // Gestionar visibilidad del Sticky Total Bar
      updateStickyBarVisibility();

      // Actualizar título de la página
      updatePageTitle(targetTab);
    });
  });
}

/**
 * Oculta todos los paneles internos (Mapa, Cotizador, etc)
 */
function hideInternalPanels() {
  const panels = document.querySelectorAll('.internal-form');
  panels.forEach(p => p.style.display = 'none');

  const lists = ['herramientas-lista', 'carga-buttons'];
  lists.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  });
}

/**
 * Actualiza el título de la página según el tab
 */
function updatePageTitle(tab) {
  const pageTitle = document.getElementById('page-title');
  if (!pageTitle) return;

  const titles = {
    'carga': 'Carga de Cliente',
    'herramientas': 'Herramientas',
    'crm': 'CRM'
  };
  pageTitle.textContent = titles[tab] || 'Claro Asesor';
}

function updateStickyBarVisibility() {
  const stickyBar = document.getElementById('sticky-total-bar');
  const panel = document.getElementById('calculator-panel');
  if (!stickyBar || !panel) return;

  // Comprobar si el panel está visible (no tiene display: none)
  const isCalculatorVisible = window.getComputedStyle(panel).display !== 'none';
  stickyBar.style.display = isCalculatorVisible ? 'flex' : 'none';
}


// ========== Carga de Botones Dinámicos ==========

/**
 * Carga botones de links dinámicamente desde links.json
 * @param {string} containerId - ID del contenedor donde insertar los botones
 * @param {string} dataKey - Clave del array en links.json
 */
async function loadLinkButtons(containerId, dataKey) {
  const container = document.getElementById(containerId);
  if (!container) return;

  // 1. Mostrar Skeletons
  container.innerHTML = `
    <div class="carga-link-btn" style="pointer-events: none;">
      <div class="carga-link-icon skeleton" style="border-radius: 12px;"></div>
      <div class="carga-link-content" style="gap: 5px;">
        <div class="skeleton" style="height: 1.1rem; width: 60%;"></div>
        <div class="skeleton" style="height: 0.85rem; width: 80%;"></div>
      </div>
    </div>
    <div class="carga-link-btn" style="pointer-events: none;">
      <div class="carga-link-icon skeleton" style="border-radius: 12px;"></div>
      <div class="carga-link-content" style="gap: 5px;">
        <div class="skeleton" style="height: 1.1rem; width: 50%;"></div>
        <div class="skeleton" style="height: 0.85rem; width: 90%;"></div>
      </div>
    </div>
  `;

  // ID del empty state según el contenedor
  const emptyStateId = containerId.replace('-buttons', '-empty');
  const emptyStateEl = document.getElementById(emptyStateId);
  if (emptyStateEl) emptyStateEl.style.display = 'none';

  try {
    const response = await fetch(`links.json?v=${Date.now()}`);
    if (!response.ok) throw new Error('No se pudo cargar links.json');

    const data = await response.json();
    
    // 2. Verificar datos vacíos
    if (!data[dataKey] || data[dataKey].length === 0) {
      container.innerHTML = '';
      if (emptyStateEl) fadeIn(emptyStateEl);
      return;
    }

    container.innerHTML = '';
    let lastCategory = null;

    data[dataKey].forEach(item => {
      // Insert separator if category changes
      if (item.category && lastCategory && item.category !== lastCategory) {
        const separator = document.createElement('div');
        separator.className = 'link-category-separator';
        container.appendChild(separator);
      }
      lastCategory = item.category;

      const link = document.createElement('a');
      link.className = 'carga-link-btn';
      link.id = item.id;

      // Handle internal forms and special actions
      if (item.action === 'internal-form' && item.targetId) {
        link.href = '#';
        link.target = '_self';
        link.addEventListener('click', (e) => {
          e.preventDefault();
          showInternalForm(item.targetId);
        });
      } else if (item.action === 'open-dashboard') {
        link.href = '#';
        link.target = '_self';
        link.addEventListener('click', (e) => {
          e.preventDefault();
          if (typeof window.abrirDashboard === 'function') {
            window.abrirDashboard();
          }
        });
      } else if (item.action === 'open-calculator') {
        link.href = '#';
        link.target = '_self';
        link.addEventListener('click', (e) => {
          e.preventDefault();
          showCalculator();
        });
      } else {
        link.href = item.url;
        // Solo para URLs externas sin acción especial
        if (item.url && item.url !== '#') {
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
        } else {
          link.target = '_self';
        }
      }

      // Create elements safely to prevent XSS
      const iconSpan = document.createElement('span');
      iconSpan.className = 'carga-link-icon';
      iconSpan.style.backgroundColor = `${item.color}20`;
      iconSpan.style.color = item.color;
      iconSpan.textContent = item.icono;

      const contentDiv = document.createElement('div');
      contentDiv.className = 'carga-link-content';

      const titleSpan = document.createElement('span');
      titleSpan.className = 'carga-link-title';
      titleSpan.textContent = item.nombre;

      const descSpan = document.createElement('span');
      descSpan.className = 'carga-link-desc';
      descSpan.textContent = item.descripcion;

      contentDiv.appendChild(titleSpan);
      contentDiv.appendChild(descSpan);

      const arrowSpan = document.createElement('span');
      arrowSpan.className = 'carga-link-arrow';
      arrowSpan.textContent = '→';

      link.appendChild(iconSpan);
      link.appendChild(contentDiv);
      link.appendChild(arrowSpan);

      container.appendChild(link);
    });

    // Initialize logic for Teccom Form
    initTeccomForm();

    // Initialize logic for Calculator Form
    initCalculatorForm();

  } catch (error) {
    console.error(`Error cargando botones de ${dataKey}:`, error);
    container.innerHTML = '';
    const emptyStateId = containerId.replace('-buttons', '-empty');
    const emptyStateEl = document.getElementById(emptyStateId);
    if (emptyStateEl) fadeIn(emptyStateEl);
  }
}

async function loadCargaButtons() {
  await loadLinkButtons('carga-buttons', 'cargaCliente');
}

async function loadHerramientasButtons() {
  await loadLinkButtons('herramientas-buttons', 'herramientas');
}

async function loadCrmButtons() {
  await loadLinkButtons('crm-buttons', 'crm');
}


// ========== Gestión de Líneas Móviles ==========

function addPortabilitySection(isInitial = false) {
  const container = document.querySelector(DOM_SELECTORS.PORTABILITY_SECTION);
  const card = document.createElement('div');
  card.className = 'card portability fade-in';

  // Generate unique ID suffix for ARIA labels
  const uniqueId = Date.now() + Math.random().toString(36).substr(2, 9);

  card.innerHTML = `
    <div class="card-title-container">
      <h2 class="card-title">Línea Móvil</h2>
      ${!isInitial ? '<button class="remove-line-btn" aria-label="Quitar línea móvil">Quitar</button>' : ''}
    </div>
    <div class="option">
      <label id="porta-type-label-${uniqueId}">Tipo de Línea</label>
      <select class="porta-type" aria-labelledby="porta-type-label-${uniqueId}">
        <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
        <option value="CORPORATIVO">Corporativo</option>
      </select>
    </div>
    <div class="option">
      <label id="operator-label-${uniqueId}">Operador</label>
      <select class="port-request" aria-labelledby="operator-label-${uniqueId}">
        <option value="no">No incluir</option>
        <option value="convergente">Convergente</option>
        <option value="linea_nueva">Línea Nueva</option>
        <option value="personal">Personal</option>
        <option value="movistar">Movistar / Tuenti</option>
      </select>
    </div>
    <div class="option">
      <label id="data-label-${uniqueId}">Gigas</label>
      <select class="data-amount" aria-labelledby="data-label-${uniqueId}">
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
      <label id="pack-label-${uniqueId}">Pack Adicional</label>
      <select class="extra-pack" aria-labelledby="pack-label-${uniqueId}">
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

function updateDataGigasLabels(operatorSelect) {
  const card = operatorSelect.closest('.card');
  const dataSelect = card?.querySelector('.data-amount');
  if (!dataSelect) return;

  const isConvergente = operatorSelect.value === 'convergente';
  const options = dataSelect.querySelectorAll('option');

  options.forEach(option => {
    const value = option.value;
    if (value === 'no') return;

    if (isConvergente) {
      if (!option.text.includes('+ 10 GB de Regalo')) {
        option.text = `${value} GB + 10 GB de Regalo`;
      }
    } else {
      option.text = `${value} GB`;
    }
  });
}

// ========== Formulario Interno (Teccom) ==========

function initTeccomForm() {
  const form = document.getElementById('teccom-form');
  const closeBtn = document.getElementById('close-teccom-form');
  const copyBtn = document.getElementById('copy-teccom-btn');
  const shareBtn = document.getElementById('share-teccom-btn');

  if (!form) return;

  closeBtn?.addEventListener('click', () => hideInternalForm('teccom-form'));
  copyBtn?.addEventListener('click', copyTeccomData);
  shareBtn?.addEventListener('click', shareTeccomData);
}

function showInternalForm(formId) {
  const buttonsContainer = document.getElementById('carga-buttons');
  const form = document.getElementById(formId);

  if (buttonsContainer && form) {
    buttonsContainer.style.display = 'none';
    fadeIn(form);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function hideInternalForm(formId) {
  const buttonsContainer = document.getElementById('carga-buttons');
  const form = document.getElementById(formId);

  if (buttonsContainer && form) {
    form.style.display = 'none';
    fadeIn(buttonsContainer);
  }
}

// ========== Cotizador (Herramientas) ==========

function initCalculatorForm() {
  const closeBtn = document.getElementById('calc-btn-cerrar');
  closeBtn?.addEventListener('click', hideCalculator);
}

function showCalculator() {
  const lista = document.getElementById('herramientas-lista');
  const panel = document.getElementById('calculator-panel');

  if (lista && panel) {
    lista.style.display = 'none';
    panel.style.display = 'block';
    fadeIn(panel);
    updateStickyBarVisibility();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

function hideCalculator() {
  const lista = document.getElementById('herramientas-lista');
  const panel = document.getElementById('calculator-panel');

  if (lista && panel) {
    panel.style.display = 'none';
    lista.style.display = 'flex';
    fadeIn(lista);
    updateStickyBarVisibility();
  }
}

function getTeccomFormData() {
  const fields = {
    admin: document.getElementById('teccom-admin').value,
    contact: document.getElementById('teccom-contact').value,
    time: document.getElementById('teccom-time').value,
    address: document.getElementById('teccom-address').value,
    floors: document.getElementById('teccom-floors').value,
    apts: document.getElementById('teccom-apts').value,
    type: document.getElementById('teccom-type').value
  };

  return `*SOLICITUD ACOMETIMIENTO*

*Administrador/Encargado:* ${fields.admin || '-'}
*Contacto:* ${fields.contact || '-'}
*Franja Horaria:* ${fields.time || '-'}
*Dirección:* ${fields.address || '-'}
*Pisos:* ${fields.floors || '-'}
*Dptos por Piso:* ${fields.apts || '-'}
*Tipo de Pedido:* ${fields.type}`;
}

function copyTeccomData() {
  const text = getTeccomFormData();
  navigator.clipboard.writeText(text)
    .then(() => {
      const btn = document.getElementById('copy-teccom-btn');
      showButtonFeedback(btn, '¡Copiado!', '📋 Copiar Datos');
    })
    .catch(() => showError('Error al copiar'));
}

async function shareTeccomData() {
  const text = getTeccomFormData();
  if (navigator.share) {
    try {
      await navigator.share({ title: 'Solicitud Teccom', text: text });
    } catch (err) {
      if (err.name !== 'AbortError') showError('Error al compartir');
    }
  } else {
    copyTeccomData();
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
      showError(ERROR_MESSAGES.COPY_ERROR);
    });
}

// ========== Compartir Resumen (Web Share API) ==========

async function shareSummary() {
  const breakdownItems = document.querySelectorAll('#price-breakdown .breakdown-item');
  let text = '*Resumen del Plan*\n\n';

  breakdownItems.forEach(item => {
    const label = item.querySelector('.label').innerText;
    const value = item.querySelector('.value').innerText;
    text += `- ${label}: ${value}\n`;
  });

  const total = document.querySelector(DOM_SELECTORS.TOTAL_PRICE).innerText;
  text += `\n*Total Mensual: ${total}*`;

  if (navigator.share) {
    try {
      await navigator.share({
        title: 'Cotización de Servicios',
        text: text,
      });
      console.log('Compartido exitosamente');
    } catch (err) {
      if (err.name !== 'AbortError') {
        showError('No se pudo compartir el resumen.');
      }
    }
  } else {
    copySummary();
  }
}

// ========== Chart Toggle ==========

async function toggleChartView() {
  const btn = document.getElementById('toggle-chart-btn');

  if (!chartVisible) {
    // Mostrar gráfico
    chartVisible = true;
    toggleChartVisibility(true);
    btn.textContent = '📊 Ocultar';

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

    // Si Chart.js no está cargado, indicarlo visualmente en el botón
    if (typeof Chart === 'undefined') {
      const originalText = btn.textContent;
      btn.textContent = '⏳ Cargando...';
      btn.disabled = true;
      await updateChart(breakdownItems); // Esto hará el lazy load internamente
      btn.textContent = originalText;
      btn.disabled = false;
    } else {
      updateChart(breakdownItems);
    }

  } else {
    // Ocultar gráfico
    chartVisible = false;
    toggleChartVisibility(false);
    btn.textContent = '📊 Gráfico';
  }
}
