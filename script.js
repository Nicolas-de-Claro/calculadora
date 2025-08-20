document.addEventListener("DOMContentLoaded", function () {
  let prices = {};

  // --- DOM Element Selectors ---
  const internetSpeed = document.getElementById("internet-speed");
  const addTv = document.getElementById("add-tv");
  const hasClaroAbono = document.getElementById("has-claro-abono");
  const packFutbolCheckbox = document.getElementById("pack-futbol-checkbox");
  const portRequestContainer = document.getElementById("portability-section");
  const addLineBtn = document.getElementById("add-line-btn");
  const totalPriceElement = document.getElementById("total-price");
  const bafType = document.getElementById("baf-type");
  const claroPayCheckbox = document.getElementById('claro-pay-checkbox');

  // Config Modal Elements
  const configBtn = document.getElementById("config-btn");
  const configModal = document.getElementById("config-modal");
  const closeModalBtn = document.querySelector(".close-btn");
  const saveConfigBtn = document.getElementById("save-config-btn");
  const configForm = document.getElementById("config-form");

  // --- Main Functions ---
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

  function initializeApp() {
    populateConfigForm();
    attachEventListeners();
    calculateTotalPrice();
  }

  function calculateTotalPrice() {
    let subtotal = 0;
    const breakdownItems = [];

    if (Object.keys(prices).length === 0) {
      totalPriceElement.textContent = "Cargando precios...";
      return;
    }

    const bafTypeValue = bafType.value;
    const internetSpeedValue = internetSpeed.value;
    const addTvValue = addTv.value;

    if (prices.BAF[bafTypeValue]?.internet?.[internetSpeedValue]) {
      const price = prices.BAF[bafTypeValue].internet[internetSpeedValue];
      breakdownItems.push({ label: `Internet ${internetSpeedValue}MB`, value: price });
      subtotal += price;
    }

    if (prices.BAF[bafTypeValue]?.tv?.[addTvValue]) {
      const price = prices.BAF[bafTypeValue].tv[addTvValue];
      breakdownItems.push({ label: `TV (${addTvValue} Deco/s)`, value: price });
      subtotal += price;
    }

    // Calculate Claro Abono discount
    const claroAbonoValue = hasClaroAbono.value;
    if (prices.CLARO_ABONO_DISCOUNTS?.[claroAbonoValue]) {
      const discount = prices.CLARO_ABONO_DISCOUNTS[claroAbonoValue];
      breakdownItems.push({ label: `Descuento Abono`, value: -discount });
      subtotal -= discount;
    }

    // Calculate Pack Futbol
    if (packFutbolCheckbox.checked && prices.ADICIONALES?.PACK_FUTBOL) {
      const price = prices.ADICIONALES.PACK_FUTBOL;
      breakdownItems.push({ label: `Pack Fútbol`, value: price });
      subtotal += price;
    }

    const portRequests = portRequestContainer.querySelectorAll(".portability");
    portRequests.forEach(function (portRequest, index) {
      const portaTypeValue = portRequest.querySelector(".porta-type").value;
      const portRequestValue = portRequest.querySelector(".port-request").value;
      const dataAmountValue = portRequest.querySelector(".data-amount").value;
      const packValue = portRequest.querySelector(".extra-pack").value;

      let linePrice = 0;
      let lineLabel = `Línea ${index + 1}`;

      if (prices.PORTA[portaTypeValue]?.[portRequestValue]?.[dataAmountValue]) {
        const price = prices.PORTA[portaTypeValue][portRequestValue][dataAmountValue];
        lineLabel += ` (${dataAmountValue}GB)`;
        linePrice += price;
      }

      if (prices.ADICIONALES?.[packValue]) {
        const packPrice = prices.ADICIONALES[packValue];
        lineLabel += ` + Pack`;
        linePrice += packPrice;
      }

      if(linePrice > 0){
        breakdownItems.push({ label: lineLabel, value: linePrice });
        subtotal += linePrice;
      }
    });

    if(claroPayCheckbox.checked && prices.CLARO_PAY){
        const cashback = subtotal * prices.CLARO_PAY.CASHBACK_PERCENTAGE;
        const finalCashback = Math.min(cashback, prices.CLARO_PAY.CASHBACK_CAP);
        if(finalCashback > 0){
            breakdownItems.push({ label: `Cashback Claro Pay`, value: -finalCashback });
            subtotal -= finalCashback;
        }
    }

    renderBreakdown(breakdownItems);
    totalPriceElement.textContent = formatCurrency(subtotal);
  }

  function renderBreakdown(items) {
    const breakdownContainer = document.getElementById('price-breakdown');
    const separator = document.querySelector('.total-separator');
    breakdownContainer.innerHTML = '';

    if (items.length > 0) {
      items.forEach(item => {
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

  function formatCurrency(value) {
    return `$${value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ".").replace(/\.(?=\d{2}$)/, ",")}`;
  }

  // --- Event Listeners ---
  function attachEventListeners() {
    bafType.addEventListener("change", calculateTotalPrice);
    internetSpeed.addEventListener("change", calculateTotalPrice);
    addTv.addEventListener("change", calculateTotalPrice);
    hasClaroAbono.addEventListener("change", calculateTotalPrice);
    packFutbolCheckbox.addEventListener("change", calculateTotalPrice);
    claroPayCheckbox.addEventListener('change', calculateTotalPrice);
    addLineBtn.addEventListener("click", () => addPortabilitySection(false));

    configBtn.addEventListener("click", () => { configModal.style.display = "block"; });
    closeModalBtn.addEventListener("click", () => { configModal.style.display = "none"; });
    window.addEventListener("click", (event) => { 
        if (event.target == configModal) { configModal.style.display = "none"; } 
    });
    saveConfigBtn.addEventListener("click", saveConfig);
    document.getElementById('copy-summary-btn').addEventListener('click', copySummary);
  }

  function copySummary() {
    let summaryText = "Resumen de Cotización:\n";
    summaryText += "--------------------\n";
    const breakdownContainer = document.getElementById('price-breakdown');
    const items = breakdownContainer.querySelectorAll('.breakdown-item');
    
    items.forEach(item => {
        const label = item.querySelector('.label').textContent;
        const value = item.querySelector('.value').textContent;
        summaryText += `${label}: ${value}\n`;
    });

    summaryText += "--------------------\n";
    const total = document.querySelector('.total-final h2').textContent;
    const totalPrice = document.getElementById('total-price').textContent;
    summaryText += `${total}: ${totalPrice}`;

    navigator.clipboard.writeText(summaryText).then(() => {
        const copyBtn = document.getElementById('copy-summary-btn');
        copyBtn.textContent = '¡Copiado!';
        copyBtn.classList.add('copied');
        setTimeout(() => {
            copyBtn.textContent = 'Copiar Resumen';
            copyBtn.classList.remove('copied');
        }, 2000);
    }).catch(err => {
        console.error("Error al copiar: ", err);
    });
  }

  // --- Portability Section Management ---
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
        <select class="data-amount" disabled>
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
    card.addEventListener('change', calculateTotalPrice);
    if (!isInitial) {
      card.querySelector(".remove-line-btn").addEventListener("click", () => removePortabilitySection(card));
    }
  }

  function removePortabilitySection(cardElement) {
    cardElement.remove();
    calculateTotalPrice();
  }

  function toggleDataAmount(selectElement) {
    const portabilitySection = selectElement.closest(".portability");
    if (!portabilitySection) return;
    const portRequest = portabilitySection.querySelector(".port-request").value;
    const dataAmount = portabilitySection.querySelector(".data-amount");
    dataAmount.disabled = portRequest === "no";
  }

  // --- Configuration Modal Logic ---
  function saveConfig() {
    const inputs = configForm.querySelectorAll("input[data-key]");
    inputs.forEach(input => {
        const keys = input.dataset.key.split('.');
        let temp = prices;
        for(let i = 0; i < keys.length - 1; i++){
            temp = temp[keys[i]];
        }
        temp[keys[keys.length - 1]] = parseFloat(input.value) || 0;
    });
    localStorage.setItem("calculatorPrices", JSON.stringify(prices));
    configModal.style.display = "none";
    calculateTotalPrice();
  }

  function populateConfigForm() {
    configForm.innerHTML = ""; // Clear previous form

    const createInput = (key, label, value) => {
        const group = document.createElement('div');
        group.className = 'price-input-group';
        const labelEl = document.createElement('label');
        labelEl.textContent = label;
        const inputEl = document.createElement('input');
        inputEl.type = 'number';
        inputEl.value = value;
        inputEl.dataset.key = key;
        group.appendChild(labelEl);
        group.appendChild(inputEl);
        configForm.appendChild(group);
    };

    const traverseObject = (obj, path, level) => {
        const title = document.createElement(`h${level > 4 ? 4 : level}`);
        title.textContent = path.split('.').pop().replace(/_/g, ' ');
        configForm.appendChild(title);

        for (const key in obj) {
            const newPath = path ? `${path}.${key}` : key;
            const currentValue = obj[key];

            if (typeof currentValue === 'object' && currentValue !== null) {
                traverseObject(currentValue, newPath, level + 1);
            } else {
                createInput(newPath, key.replace(/_/g, ' ') + ':', currentValue);
            }
        }
    };

    for (const category in prices) {
        traverseObject(prices[category], category, 3);
    }
  }

  // --- Initial Load ---
  loadPrices();
});
