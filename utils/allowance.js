// utils/allowance.js
const RATE_PER_KM = process.env.RATE_PER_KM ? Number(process.env.RATE_PER_KM) : 2;

function expectedFromDistance(distanceKm = 0, rate = RATE_PER_KM) {
  return distanceKm * rate;
}

module.exports = { expectedFromDistance, RATE_PER_KM };
