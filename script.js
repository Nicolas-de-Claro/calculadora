document.addEventListener("DOMContentLoaded", function () {
  // Price constants
  const INTERNET_PRICES = {
    100: 10000,
    300: 14000,
    600: 27000,
  };

  const TV_PRICES = {
    1: 14000,
    2: 17000,
    3: 20000,
  };

  const CLARO_ABONO_DISCOUNTS = {
    1: 1500,
    2: 2000,
  };

  const PORTABILITY_PRICES = {
    linea_nueva: {
      2: 3345,
      4: 4313,
      7: 5745,
      10: 8535,
      20: 11085,
      30: 12780,
    },
    movistar: {
      2: 3345,
      4: 4313,
      7: 5745,
      10: 8535,
      20: 11085,
      30: 12780,
    },
    tuenti: {
      2: 3345,
      4: 4313,
      7: 5745,
      10: 8535,
      20: 11085,
      30: 12780,
    },
    personal: {
      2: 13380,
      4: 17250,
      7: 22980,
      10: 34140,
      20: 44340,
      30: 51120,
    },
  };

  const internetSpeed = document.getElementById("internet-speed");
  const addTv = document.getElementById("add-tv");
  const hasClaroAbono = document.getElementById("has-claro-abono");
  const portRequestContainer = document.getElementById("portability-section");
  const addLineBtn = document.querySelector(".add-line-btn");
  const totalPriceElement = document.getElementById("total-price");

  // Calculate price when inputs change
  function calculateTotalPrice() {
    let totalPrice = 0;

    // Calculate Internet Speed price
    const internetSpeedValue = internetSpeed.value;
    if (INTERNET_PRICES[internetSpeedValue]) {
      totalPrice += INTERNET_PRICES[internetSpeedValue];
    }

    // Calculate TV price
    const addTvValue = addTv.value;
    if (TV_PRICES[addTvValue]) {
      totalPrice += TV_PRICES[addTvValue];
    }

    // Calculate Claro Abono price
    const claroAbonoValue = hasClaroAbono.value;
    if (CLARO_ABONO_DISCOUNTS[claroAbonoValue]) {
      totalPrice -= CLARO_ABONO_DISCOUNTS[claroAbonoValue];
    }

    // Calculate portability price
    const portRequests = portRequestContainer.querySelectorAll(".portability");
    portRequests.forEach(function (portRequest) {
      const portRequestValue = portRequest.querySelector(".port-request").value;
      const dataAmountValue = portRequest.querySelector(".data-amount").value;
      const dataAmountPrices = PORTABILITY_PRICES[portRequestValue];

      if (dataAmountPrices && dataAmountPrices[dataAmountValue]) {
        totalPrice += dataAmountPrices[dataAmountValue];
      }
    });

    // Update total price display with thousand separator and decimal comma
    totalPriceElement.textContent = `$${totalPrice
      .toFixed(2)
      .replace(/\B(?=(\d{3})+(?!\d))/g, ".")
      .replace(/\.(?=\d{2}$)/, ",")}`;
  }

  // Event listeners
  internetSpeed.addEventListener("change", calculateTotalPrice);
  addTv.addEventListener("change", calculateTotalPrice);
  hasClaroAbono.addEventListener("change", calculateTotalPrice);
  addLineBtn.addEventListener("click", function () {
    addPortabilitySection();
    calculateTotalPrice();
  });

  portRequestContainer.addEventListener("change", function (event) {
    if (
      event.target.classList.contains("port-request") ||
      event.target.classList.contains("data-amount")
    ) {
      toggleDataAmount(event.target);
      calculateTotalPrice();
    }
  });

  // Add new portability section
  function addPortabilitySection() {
    const portabilitySection = document.querySelector(".portability");
    const newPortabilitySection = portabilitySection.cloneNode(true);
    newPortabilitySection.querySelectorAll("select").forEach((select) => {
      select.value = "no";
    });
    newPortabilitySection.querySelector(".remove-line-btn")?.remove();
    const removeButton = document.createElement("button");
    removeButton.className = "remove-line-btn";
    removeButton.textContent = "Quitar";
    removeButton.onclick = function () {
      removePortabilitySection(removeButton);
      calculateTotalPrice();
    };
    newPortabilitySection.appendChild(removeButton);

    // Update the classes of cloned elements to prevent duplicate interactions
    newPortabilitySection
      .querySelector(".port-request")
      .classList.add("port-request");
    newPortabilitySection
      .querySelector(".data-amount")
      .classList.add("data-amount");

    portRequestContainer.appendChild(newPortabilitySection);
  }

  // Remove portability section
  function removePortabilitySection(buttonElement) {
    const portabilitySection = buttonElement.parentElement;
    portabilitySection.remove();
    calculateTotalPrice();
  }

  // Toggle data amount availability based on port request selection
  function toggleDataAmount(selectElement) {
    const portRequest = selectElement.value;
    const dataAmount = selectElement
      .closest(".portability")
      .querySelector(".data-amount");
    dataAmount.disabled = portRequest === "no";
  }
});
