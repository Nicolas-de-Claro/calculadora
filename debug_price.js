const fs = require('fs');
const prices = JSON.parse(fs.readFileSync('prices.json', 'utf8'));

const portaType = "CONSUMIDOR_FINAL";
const operator = "personal";
const dataAmount = "2";
const extraPack = "PACK_10_GB";

let price = 0;

console.log(`Inputs: ${portaType}, ${operator}, ${dataAmount}, ${extraPack}`);

const basePrice = prices.PORTA[portaType][operator][dataAmount];
console.log(`Base Price (prices.PORTA.${portaType}.${operator}["${dataAmount}"]): ${basePrice}`);

if (prices.ADICIONALES[extraPack]) {
    const packPrice = prices.ADICIONALES[extraPack];
    console.log(`Pack Price (prices.ADICIONALES.${extraPack}): ${packPrice}`);
    price = basePrice + packPrice;
} else {
    price = basePrice;
}

console.log(`Total Calculated: ${price}`);
console.log(`User Reported/Displayed: 22720`);
console.log(`Difference: ${22720 - price}`);
