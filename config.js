// Chaves de API
const API_KEYS = {
  OPENWEATHER: "952cb57ee29901bb41c8dc4ebcb1e1eeab29ae92b83635811bed78d6e40b67af",
  STORMGLASS: "bcbd1504-6727-11f0-bc20-0242ac130006-bcbd1572-6727-11f0-bc20-0242ac130006",
};

// Localizações padrão
const DEFAULT_LOCATIONS = {
  weather: { 
    lat: 39.3605, 
    lon: -9.1567, 
    name: "Óbidos, Portugal",
    country: "PT"
  },
  tides: { 
    lat: 39.3558, 
    lon: -9.38112, 
    name: "Baleal",
    country: "PT"
  }
};

// Configurações de visualização
const VIEW_CONFIG = {
  current: {
    hours: 24,
    updateInterval: 10 * 60 * 1000,
  },
  today: {
    hours: 12,
    updateInterval: 5 * 60 * 1000,
  },
  week: {
    days: 7,
    updateInterval: 30 * 60 * 1000,
  }
};

// Mapeamento de ícones para condições climáticas
const WEATHER_ICONS = {
  "01d": "fas fa-sun",
  "01n": "fas fa-moon",
  "02d": "fas fa-cloud-sun",
  "02n": "fas fa-cloud-moon",
  "03d": "fas fa-cloud",
  "03n": "fas fa-cloud",
  "04d": "fas fa-cloud",
  "04n": "fas fa-cloud",
  "09d": "fas fa-cloud-showers-heavy",
  "09n": "fas fa-cloud-showers-heavy",
  "10d": "fas fa-cloud-sun-rain",
  "10n": "fas fa-cloud-moon-rain",
  "11d": "fas fa-bolt",
  "11n": "fas fa-bolt",
  "13d": "fas fa-snowflake",
  "13n": "fas fa-snowflake",
  "50d": "fas fa-smog",
  "50n": "fas fa-smog",
  "clear": "fas fa-sun",
  "partly-cloudy": "fas fa-cloud-sun",
  "cloudy": "fas fa-cloud",
  "rain": "fas fa-cloud-rain",
  "thunderstorm": "fas fa-bolt",
  "snow": "fas fa-snowflake",
  "fog": "fas fa-smog",
  "windy": "fas fa-wind"
};

// Cores para os gráficos
const CHART_COLORS = {
  temperature: {
    line: 'rgba(255, 99, 132, 0.8)',
    fill: 'rgba(255, 99, 132, 0.1)'
  },
  precipitation: {
    line: 'rgba(54, 162, 235, 0.8)',
    fill: 'rgba(54, 162, 235, 0.1)'
  },
  humidity: {
    line: 'rgba(75, 192, 192, 0.8)',
    fill: 'rgba(75, 192, 192, 0.1)'
  },
  wind: {
    line: 'rgba(255, 206, 86, 0.8)',
    fill: 'rgba(255, 206, 86, 0.1)'
  },
  pressure: {
    line: 'rgba(153, 102, 255, 0.8)',
    fill: 'rgba(153, 102, 255, 0.1)'
  },
  uv: {
    line: 'rgba(255, 159, 64, 0.8)',
    fill: 'rgba(255, 159, 64, 0.1)'
  }
};

// Configuração do mapa
const MAP_CONFIG = {
  tileLayer: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
  attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
  zoom: 10,
  maxZoom: 18
};

// Tornar as variáveis globais no navegador
if (typeof window !== 'undefined') {
  window.CONFIG = {
    API_KEYS,
    DEFAULT_LOCATIONS,
    VIEW_CONFIG,
    WEATHER_ICONS,
    CHART_COLORS,
    MAP_CONFIG
  };
}

// Exportar para Node.js (se necessário)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    API_KEYS,
    DEFAULT_LOCATIONS,
    VIEW_CONFIG,
    WEATHER_ICONS,
    CHART_COLORS,
    MAP_CONFIG
  };
}