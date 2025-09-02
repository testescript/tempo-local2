// config.js
const LOCATIONS = {
  weather: {
    lat: 39.3606, // Óbidos
    lon: -9.1575,
  },
  tides: {
    lat: 39.3872, // Foz do Arelho (exemplo)
    lon: -9.2139,
  },
};

if (typeof module !== 'undefined') {
  module.exports = { LOCATIONS };
}