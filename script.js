document.addEventListener("DOMContentLoaded", function () {
  // Variable para almacenar los precios cargados (desde JSON o localStorage)
  let prices = {};

  // --- Selectores de Elementos del DOM ---
  // Elementos principales de la interfaz de usuario
  const internetSpeed = document.getElementById("internet-speed");
  const addTv = document.getElementById("add-tv");
  const portRequestContainer = document.getElementById("portability-section");
  const addLineBtn = document.getElementById("add-line-btn");
  const totalPriceElement = document.getElementById("total-price");
  const bafType = document.getElementById("baf-type");
  const claroPayCheckbox = document.getElementById('claro-pay-checkbox');
  const hasClaroAbono = document.getElementById("has-claro-abono");
  const packFutbolCheckbox = document.getElementById("pack-futbol-checkbox"); // Aseguramos que esté seleccionado

  // Elementos del Modal de Configuración
  const configBtn = document.getElementById("config-btn");
  const configModal = document.getElementById("config-modal");
  const closeModalBtn = document.querySelector(".close-btn");
  const saveConfigBtn = document.getElementById("save-config-btn");
  const configForm = document.getElementById("config-form");

  // --- Funciones Principales de la Aplicación ---

  /**
   * Carga los precios de la calculadora. Intenta cargarlos desde localStorage primero.
   * Si no están en localStorage, los carga desde el archivo prices.json.
   */
  function loadPrices() {
    const localPrices = localStorage.getItem("calculatorPrices");
    if (localPrices) {
      prices = JSON.parse(localPrices);
      initializeApp();
    } else {
      fetch("prices.json")
        .then((response) => response.json())
        .then((data) => {
          prices = data;
          initializeApp();
        })
        .catch((error) => console.error("Error loading prices:", error));
    }
  }

  /**
   * Inicializa la aplicación una vez que los precios han sido cargados.
   * Configura la primera línea móvil, el formulario de configuración, los listeners de eventos y calcula el total inicial.
   */
  function initializeApp() {
    // addPortabilitySection(true); // Se comenta para que no aparezca la línea móvil al inicio
    populateConfigForm(); // Rellena el formulario de configuración con los precios actuales
    attachEventListeners(); // Adjunta todos los listeners de eventos a los elementos de la UI
    calculateTotalPrice(); // Realiza el cálculo inicial del precio total
  }

  /**
   * Calcula el precio total de todos los servicios seleccionados.
   * Recopila los precios de Internet/TV, descuentos, líneas móviles y cashback.
   * Actualiza el desglose de precios y el total en la interfaz.
   */
  function calculateTotalPrice() {
    let subtotal = 0; // Acumulador del subtotal antes de aplicar el cashback
    const breakdownItems = []; // Array para almacenar los elementos del desglose de precios

    // Si los precios aún no se han cargado, muestra un mensaje y sale
    if (Object.keys(prices).length === 0) {
      totalPriceElement.textContent = "Cargando precios...";
      return;
    }

    // Obtiene los valores seleccionados para Internet y TV
    const bafTypeValue = bafType.value;
    const internetSpeedValue = internetSpeed.value;
    const addTvValue = addTv.value;

    // Calcula el costo de Internet y TV y lo añade al subtotal y al desglose
    const internetTvResult = getInternetAndTvCost(bafTypeValue, internetSpeedValue, addTvValue);
    if (internetTvResult.price > 0) {
      subtotal += internetTvResult.price;
      breakdownItems.push(...internetTvResult.breakdown);
    }

    // Calcula el descuento por Abono Claro y lo aplica al subtotal y al desglose
    const claroAbonoResult = getClaroAbonoDiscount(hasClaroAbono.value);
    if (claroAbonoResult.discount > 0) {
      subtotal -= claroAbonoResult.discount;
      breakdownItems.push(claroAbonoResult.breakdown);
    }

    // Calcula el costo del Pack Fútbol
    if (packFutbolCheckbox.checked && prices.ADICIONALES?.PACK_FUTBOL) {
      const price = prices.ADICIONALES.PACK_FUTBOL;
      breakdownItems.push({ label: `Pack Fútbol`, value: price });
      subtotal += price;
    }

    // Itera sobre cada línea móvil añadida para calcular su costo y añadirlo al subtotal y al desglose
    const portRequests = portRequestContainer.querySelectorAll(".portability");
    portRequests.forEach(function (portRequest, index) {
      const lineResult = getLineCost(portRequest, index);
      if (lineResult.price > 0) {
        subtotal += lineResult.price;
        breakdownItems.push(lineResult.breakdown);
      }
    });

    // Calcula el cashback de Claro Pay y lo aplica al subtotal y al desglose
    const claroPayResult = getClaroPayCashback(subtotal);
    if (claroPayResult.cashback > 0) {
      subtotal -= claroPayResult.cashback;
      breakdownItems.push(claroPayResult.breakdown);
    }

    // Renderiza el desglose de precios en la interfaz
    renderBreakdown(breakdownItems);
    // Actualiza el precio total final en la interfaz
    totalPriceElement.textContent = formatCurrency(subtotal);
  }

  // --- Funciones Auxiliares de Cálculo ---

  /**
   * Calcula el costo combinado de Internet y TV.
   * @param {string} bafTypeValue - Tipo de plan BAF (RESIDENCIAL, IP_DINAMICA, IP_FIJA).
   * @param {string} internetSpeedValue - Velocidad de Internet seleccionada.
   * @param {string} addTvValue - Número de decodificadores de TV.
   * @returns {{price: number, breakdown: Array<{label: string, value: number}>}} - Objeto con el precio total y los ítems de desglose.
   */
  function getInternetAndTvCost(bafTypeValue, internetSpeedValue, addTvValue) {
    let price = 0;
    const breakdown = [];

    // Añade el costo de Internet si está disponible
    if (prices.BAF[bafTypeValue]?.internet?.[internetSpeedValue]) {
      price += prices.BAF[bafTypeValue].internet[internetSpeedValue];
      breakdown.push({ label: `Internet ${internetSpeedValue}MB`, value: prices.BAF[bafTypeValue].internet[internetSpeedValue] });
    }

    // Añade el costo de TV si está disponible (depende del tipo de BAF)
    if (prices.BAF[bafTypeValue]?.tv?.[addTvValue]) {
      price += prices.BAF[bafTypeValue].tv[addTvValue];
      breakdown.push({ label: `TV (${addTvValue} Deco/s)`, value: prices.BAF[bafTypeValue].tv[addTvValue] });
    }
    return { price, breakdown };
  }

  /**
   * Calcula el descuento por Abono Claro.
   * @param {string} claroAbonoValue - Valor seleccionado para el abono Claro (1, 2, o 'no').
   * @returns {{discount: number, breakdown: {label: string, value: number}|null}} - Objeto con el monto del descuento y el ítem de desglose.
   */
  function getClaroAbonoDiscount(claroAbonoValue) {
    let discount = 0;
    let breakdownItem = null;
    if (prices.CLARO_ABONO_DISCOUNTS?.[claroAbonoValue]) {
      discount = prices.CLARO_ABONO_DISCOUNTS[claroAbonoValue];
      breakdownItem = { label: `Descuento Abono`, value: -discount };
    }
    return { discount, breakdown: breakdownItem };
  }

  /**
   * Calcula el costo de una línea móvil individual, incluyendo packs adicionales.
   * @param {HTMLElement} portRequest - El elemento DOM de la tarjeta de la línea móvil.
   * @param {number} index - El índice de la línea móvil (para la etiqueta).
   * @returns {{price: number, breakdown: {label: string, value: number}}} - Objeto con el precio total de la línea y su ítem de desglose.
   */
  function getLineCost(portRequest, index) {
    let price = 0;
    let label = `Línea ${index + 1}`;

    const portaTypeValue = portRequest.querySelector(".porta-type").value;
    const portRequestValue = portRequest.querySelector(".port-request").value;
    const dataAmountValue = portRequest.querySelector(".data-amount").value;
    const packValue = portRequest.querySelector(".extra-pack").value;

    // Añade el costo base de la línea según el tipo de porta y gigas
    if (prices.PORTA[portaTypeValue]?.[portRequestValue]?.[dataAmountValue]) {
      price += prices.PORTA[portaTypeValue][portRequestValue][dataAmountValue];
      label += ` (${dataAmountValue}GB)`;
    }

    // Añade el costo del pack adicional si está seleccionado
    if (prices.ADICIONALES?.[packValue] && packValue !== 'no') {
      price += prices.ADICIONALES[packValue];
      label += ` + Pack`;
    }
    return { price, breakdown: { label, value: price } };
  }

  /**
   * Calcula el cashback de Claro Pay.
   * @param {number} currentSubtotal - El subtotal actual antes de aplicar el cashback.
   * @returns {{cashback: number, breakdown: {label: string, value: number}|null}} - Objeto con el monto del cashback y el ítem de desglose.
   */
  function getClaroPayCashback(currentSubtotal) {
    let cashback = 0;
    let breakdownItem = null;
    if (claroPayCheckbox.checked && prices.CLARO_PAY) {
      const calculatedCashback = currentSubtotal * prices.CLARO_PAY.CASHBACK_PERCENTAGE;
      cashback = Math.min(calculatedCashback, prices.CLARO_PAY.CASHBACK_CAP);
      if (cashback > 0) {
        breakdownItem = { label: `Cashback Claro Pay`, value: -cashback };
      }
    }
    return { cashback, breakdown: breakdownItem };
  }

  // --- Funciones de Renderizado de UI ---

  /**
   * Renderiza los ítems del desglose de precios en la interfaz.
   * @param {Array<{label: string, value: number}>} items - Array de ítems a mostrar en el desglose.
   */
  function renderBreakdown(items) {
    const breakdownContainer = document.getElementById('price-breakdown');
    const separator = document.querySelector('.total-separator');
    breakdownContainer.innerHTML = '';

    // Filtra ítems válidos (que no sean nulos y tengan valor distinto de 0)
    const validItems = items.filter(item => item && item.value !== 0);

    if (validItems.length > 0) {
      validItems.forEach(item => {
        const div = document.createElement('div');
        div.className = 'breakdown-item';
        div.innerHTML = `<span class="label">${item.label}</span> <span class="value">${formatCurrency(item.value)}</span>`;
        breakdownContainer.appendChild(div);
      });
      separator.style.display = 'block';
    } else {
      separator.style.display = 'none';
    }
  }

  /**
   * Formatea un valor numérico a formato de moneda.
   * @param {number} value - El valor numérico a formatear.
   * @returns {string} - El valor formateado como cadena de moneda.
   */
  function formatCurrency(value) {
    return `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".").replace(/\.(?=\d{2}$)/, ",")}`;
  }

  // --- Gestión de Eventos ---

  /**
   * Adjunta todos los listeners de eventos a los elementos interactivos de la UI.
   */
  function attachEventListeners() {
    // Listeners para los selectores principales que disparan el cálculo
    bafType.addEventListener("change", calculateTotalPrice);
    internetSpeed.addEventListener("change", calculateTotalPrice);
    addTv.addEventListener("change", calculateTotalPrice);
    hasClaroAbono.addEventListener("change", calculateTotalPrice);
    packFutbolCheckbox.addEventListener("change", calculateTotalPrice); // Listener para Pack Fútbol
    claroPayCheckbox.addEventListener('change', calculateTotalPrice);

    // Listener para el botón de añadir línea móvil
    addLineBtn.addEventListener("click", () => addPortabilitySection(false));

    // Listeners para el modal de configuración
    configBtn.addEventListener("click", () => { populateConfigForm(); configModal.style.display = "block"; });
    closeModalBtn.addEventListener("click", () => { configModal.style.display = "none"; });
    window.addEventListener("click", (event) => {
      if (event.target == configModal) { configModal.style.display = "none"; }
    });
    saveConfigBtn.addEventListener("click", saveConfig);

    // Listener para copiar el resumen
    document.getElementById('copy-summary-btn').addEventListener('click', copySummary);

    // Listener delegado para cambios en las líneas móviles (portabilidad)
    portRequestContainer.addEventListener("change", function (event) {
      if (event.target.matches(".port-request, .data-amount, .porta-type, .extra-pack")) {
        calculateTotalPrice();
      }
    });
  }

  // --- Gestión de Secciones de Portabilidad ---

  /**
   * Añade una nueva sección de línea móvil a la interfaz.
   * @param {boolean} isInitial - True si es la primera línea que se añade al cargar la página.
   */
  function addPortabilitySection(isInitial = false) {
    const card = document.createElement("div");
    card.className = "card portability";
    card.innerHTML = `
      <div class="card-title-container">
        <h2 class="card-title">Línea Móvil</h2>
        ${!isInitial ? '<button class="remove-line-btn">Quitar</button>' : ''}
      </div>
      <div class="option">
        <label>Tipo de Línea</label>
        <select class="porta-type">
          <option value="CONSUMIDOR_FINAL">Consumidor Final</option>
          <option value="CORPORATIVO">Corporativo</option>
        </select>
      </div>
      <div class="option">
        <label>Operador</label>
        <select class="port-request">
          <option value="no">No incluir</option>
          <option value="linea_nueva">Línea Nueva</option>
          <option value="personal">Personal</option>
          <option value="movistar">Movistar</option>
          <option value="tuenti">Tuenti</option>
          <option value="convergente">Convergente</option>
        </select>
      </div>
      <div class="option">
        <label>Gigas</label>
        <select class="data-amount">
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
        <label>Pack Adicional</label>
        <select class="extra-pack">
            <option value="no">Ninguno</option>
            <option value="PACK_10_GB">Pack 10 GB</option>
            <option value="PACK_15_GB">Pack 15 GB</option>
        </select>
      </div>
    `;
    portRequestContainer.appendChild(card);
    // Adjunta el listener de cambio a la nueva tarjeta para recalcular el total
    card.addEventListener('change', calculateTotalPrice);
    // Si no es la línea inicial, añade el botón de quitar y su listener
    if (!isInitial) {
      card.querySelector(".remove-line-btn").addEventListener("click", () => removePortabilitySection(card));
    }
    // Asegura que el selector de gigas esté habilitado/deshabilitado correctamente al añadir la línea
    updateClaroAbonoSelection(); // Actualiza la selección de abono
  }

  /**
   * Elimina una sección de línea móvil de la interfaz.
   * @param {HTMLElement} cardElement - El elemento DOM de la tarjeta de la línea móvil a eliminar.
   */
  function removePortabilitySection(cardElement) {
    cardElement.remove();
    updateClaroAbonoSelection(); // Actualiza la selección de abono
    calculateTotalPrice();
  }

  /**
   * Actualiza la selección del descuento por Abono Claro según el número de líneas móviles activas.
   */
  function updateClaroAbonoSelection() {
    const activeLines = portRequestContainer.querySelectorAll(".portability").length;
    if (activeLines === 0) {
      hasClaroAbono.value = "no";
    } else if (activeLines === 1) {
      hasClaroAbono.value = "1";
    } else {
      hasClaroAbono.value = "2";
    }
  }

  // --- Lógica del Modal de Configuración ---

  /**
   * Guarda los precios editados desde el editor JSON en localStorage y cierra el modal.
   * Valida que el JSON sea válido antes de guardar.
   */
  function saveConfig() {
    const jsonEditor = document.getElementById("json-editor");
    const errorContainer = document.getElementById("validation-error");

    // Reset error state
    errorContainer.style.display = "none";
    errorContainer.textContent = "";
    jsonEditor.style.borderColor = "";

    try {
      const newPrices = JSON.parse(jsonEditor.value);

      // Basic validation
      if (!newPrices || typeof newPrices !== 'object') {
        throw new Error("El contenido debe ser un objeto JSON válido.");
      }

      prices = newPrices;
      localStorage.setItem("calculatorPrices", JSON.stringify(prices));

      calculateTotalPrice();

      configModal.style.display = "none";
      alert("Precios actualizados correctamente.");
    } catch (e) {
      console.error("Error saving config:", e);

      // Show error in UI
      errorContainer.textContent = `⚠️ Error en JSON: ${e.message}`;
      errorContainer.style.display = "block";
      jsonEditor.style.borderColor = "#c62828";

      // Scroll to top of modal to see error if needed
      configModal.querySelector('.modal-content').scrollTop = 0;
    }
  }

  /**
   * Rellena el textarea del modal de configuración con el JSON de precios actual.
   */
  function populateConfigForm() {
    const jsonEditor = document.getElementById("json-editor");
    // Safety check: Ensure prices is an object to prevent double-stringification
    if (typeof prices === 'string') {
      try { prices = JSON.parse(prices); } catch (e) { console.error("Error parsing prices string:", e); }
    }
    jsonEditor.value = JSON.stringify(prices, null, 2);
  }

  // --- Carga Inicial de la Aplicación ---
  loadPrices();
});