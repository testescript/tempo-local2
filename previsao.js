// Configuração e variáveis globais
let tempChart;
const weatherIcons = {
  // Mapeamento básico de ícones (expandir conforme necessário)
  200: '⛈️', 201: '⛈️', 800: '☀️', 801: '🌤️', 802: '⛅', 803: '🌥️', 804: '☁️'
};

// Inicialização quando o DOM estiver carregado
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
});

function initializeApp() {
  // Configurar o formulário
  const form = document.getElementById('location-form');
  if (form) {
    form.addEventListener('submit', handleFormSubmit);
  }
  
  // Configurar botão de tema
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', toggleDarkMode);
  }
  
  // Tentar obter localização do usuário ou usar padrão
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      position => {
        document.getElementById('lat').value = position.coords.latitude.toFixed(4);
        document.getElementById('lon').value = position.coords.longitude.toFixed(4);
        // Obter previsão automaticamente
        handleFormSubmit(new Event('submit'));
      },
      error => {
        console.log('Localização não disponível:', error);
        // Usar coordenadas padrão (Lisboa)
        document.getElementById('lat').value = '38.7223';
        document.getElementById('lon').value = '-9.1393';
      }
    );
  }
}

function handleFormSubmit(e) {
  e.preventDefault();
  
  const lat = document.getElementById('lat').value;
  const lon = document.getElementById('lon').value;
  
  if (!lat || !lon) {
    alert('Por favor, insira latitude e longitude válidas.');
    return;
  }
  
  fetchWeatherData(lat, lon);
}

async function fetchWeatherData(lat, lon) {
  const statusEl = document.getElementById('status');
  if (statusEl) statusEl.textContent = 'A obter dados...';
  
  try {
    // Mostrar o conteúdo principal
    document.getElementById('content').classList.remove('hidden');
    
    // Atualizar nome da localização (usando API de geocoding reversa seria ideal)
    updateLocationName(`Localização: ${lat}, ${lon}`, lat, lon);
    
    // Simular obtenção de dados (substituir com chamadas reais às APIs)
    const mockData = generateMockData();
    
    // Atualizar KPIs
    updateKPIs(mockData.kpis);
    
    // Atualizar informações do sol
    renderSol(mockData.sunrise, mockData.sunset, mockData.dayLength);
    
    // Renderizar previsão horária
    renderHourlyForecast(mockData.hourly);
    
    // Atualizar gráficos (implementação básica)
    initializeCharts(mockData);
    
    // Atualizar hora da última atualização
    document.getElementById('update-time').textContent = 
      `Atualizado: ${new Date().toLocaleTimeString()}`;
      
    if (statusEl) statusEl.textContent = '';
    
  } catch (error) {
    console.error('Erro ao obter dados:', error);
    if (statusEl) statusEl.textContent = 'Erro ao carregar dados.';
  }
}

function updateKPIs(kpis) {
  document.getElementById('kpi-temp').textContent = `${kpis.temp}°C`;
  document.getElementById('kpi-hum').textContent = `${kpis.humidity}%`;
  document.getElementById('kpi-wind').textContent = `${kpis.windSpeed} m/s`;
  document.getElementById('kpi-press').textContent = `${kpis.pressure} hPa`;
}

function renderHourlyForecast(hourlyData) {
  const container = document.getElementById('hourly-container');
  if (!container) return;
  
  container.innerHTML = ''; // Limpar conteúdo anterior
  container.classList.remove('loading');
  
  // Criar elementos para cada hora
  hourlyData.slice(0, 12).forEach(h => { // Mostrar apenas as próximas 12 horas
    renderForecastCard(h, container);
  });
}

function renderForecastCard(h, container) {
  const date = new Date(h.dt * 1000);
  const id = (Array.isArray(h.weather) ? h.weather[0]?.id : h.weather?.id) ?? 0;
  const icon = weatherIcons[id] ?? 'ℹ️';
  const card = document.createElement('div');
  card.className = 'forecast-card';
  card.innerHTML = `
    <div class="forecast-time">${date.toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</div>
    <div class="forecast-icon">${icon}</div>
    <div class="forecast-temp">${Math.round(h.temp ?? 0)}°C</div>
    <div class="forecast-hum">${Math.round(h.humidity ?? 0)}%</div>
    <div class="forecast-pop">${Math.round(((h.pop ?? 0) * 100))}%</div>
    <div class="forecast-wind">${Math.round(h.wind_speed ?? 0)} m/s</div>
  `;
  container.appendChild(card);
}

function parseDayLength(v) {
  if (v == null) return null;
  if (typeof v === 'number') return v; // segundos
  if (typeof v === 'string') {
    // tenta HH:MM:SS
    const m = v.match(/^(\d{1,2}):(\d{2}):(\d{2})$/);
    if (m) {
      const h = parseInt(m[1], 10), mi = parseInt(m[2], 10), s = parseInt(m[3], 10);
      return h * 3600 + mi * 60 + s;
    }
    const n = Number(v);
    if (!Number.isNaN(n)) return n;
  }
  return null;
}

function renderSol(sunrise, sunset, dayLengthRaw) {
  const toHHMM = (isoOrPlain) => {
    if (!isoOrPlain) return '--:--';
    // Se vier já formatado "HH:MM", devolve; se for ISO, usa local time
    if (/^\d{1,2}:\d{2}/.test(isoOrPlain)) return isoOrPlain;
    const d = typeof isoOrPlain === 'number' ? new Date(isoOrPlain * 1000) : new Date(isoOrPlain);
    return isNaN(d) ? String(isoOrPlain) : d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  };
  
  const formatDayLength = (seconds) => {
    if (seconds == null) return '--:--';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    return `${h}h ${m}m`;
  };
  
  const sunriseEl = document.getElementById('sunrise');
  if (sunriseEl) sunriseEl.textContent = toHHMM(sunrise);
  
  const sunsetEl = document.getElementById('sunset');
  if (sunsetEl) sunsetEl.textContent = toHHMM(sunset);
  
  const dayLengthEl = document.getElementById('day-length');
  if (dayLengthEl) dayLengthEl.textContent = formatDayLength(parseDayLength(dayLengthRaw));
}

function updateLocationName(name, lat, lon) {
  const nameEl = document.getElementById('location-name');
  const coordsEl = document.getElementById('location-coords');
  if (nameEl) nameEl.textContent = name;
  if (coordsEl) coordsEl.textContent = `Lat: ${parseFloat(lat).toFixed(4)} | Lon: ${parseFloat(lon).toFixed(4)}`;
}

function consolidarDados(meteoData, weatherApiData) {
  // Implementação real para consolidar dados das diferentes APIs
  // Esta é uma implementação simplificada
  return {
    kpis: {
      temp: Math.round((meteoData.current.temperature_2m + weatherApiData.current.temp_c) / 2),
      humidity: Math.round((meteoData.current.relative_humidity_2m + weatherApiData.current.humidity) / 2),
      windSpeed: Math.round((meteoData.current.wind_speed_10m + weatherApiData.current.wind_kph / 3.6) / 2),
      pressure: Math.round(weatherApiData.current.pressure_mb)
    },
    hourly: meteoData.hourly.time.map((time, i) => ({
      dt: new Date(time).getTime() / 1000,
      temp: meteoData.hourly.temperature_2m[i],
      humidity: meteoData.hourly.relative_humidity_2m[i],
      pop: meteoData.hourly.precipitation_probability[i] / 100,
      wind_speed: meteoData.hourly.wind_speed_10m[i],
      weather: { id: getWeatherCode(meteoData.hourly.weather_code[i]) }
    })),
    sunrise: weatherApiData.forecast.forecastday[0].astro.sunrise,
    sunset: weatherApiData.forecast.forecastday[0].astro.sunset,
    dayLength: weatherApiData.forecast.forecastday[0].astro.day_length
  };
}

function getWeatherCode(code) {
  // Mapeamento simplificado de códigos meteorológicos
  const codeMap = {
    0: 800, 1: 801, 2: 802, 3: 803, 45: 804, 48: 804,
    51: 500, 53: 501, 55: 502, 61: 300, 63: 301, 65: 302,
    80: 300, 81: 301, 82: 302, 95: 200, 96: 201, 99: 202
  };
  return codeMap[code] || 800;
}

function initializeCharts(data) {
  // Implementação básica de gráficos - expandir conforme necessário
  const ctx = document.getElementById('comparison-chart');
  if (ctx && typeof Chart !== 'undefined') {
    if (tempChart) tempChart.destroy();
    
    tempChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: ['Agora', '+1h', '+2h', '+3h', '+4h', '+5h'],
        datasets: [{
          label: 'Temperatura (°C)',
          data: [data.kpis.temp, data.kpis.temp + 1, data.kpis.temp + 2, 
                 data.kpis.temp + 3, data.kpis.temp + 2, data.kpis.temp + 1],
          borderColor: 'rgb(255, 99, 132)',
          tension: 0.1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Previsão de Temperatura'
          }
        }
      }
    });
  }
}

function toggleDarkMode() {
  document.body.classList.toggle('dark-mode');
  const button = document.getElementById('theme-toggle');
  if (button) {
    button.textContent = document.body.classList.contains('dark-mode') 
      ? 'Modo Claro' 
      : 'Modo Escuro';
  }
}

// Função auxiliar para gerar dados de exemplo
function generateMockData() {
  const now = Math.floor(Date.now() / 1000);
  const hourly = [];
  
  for (let i = 0; i < 24; i++) {
    hourly.push({
      dt: now + (i * 3600),
      temp: 15 + Math.sin(i / 24 * Math.PI * 2) * 10,
      humidity: 50 + Math.sin(i / 24 * Math.PI) * 30,
      pop: Math.random() * 0.5,
      wind_speed: 3 + Math.random() * 7,
      weather: { id: i < 6 || i > 18 ? 800 : 801 }
    });
  }
  
  return {
    kpis: {
      temp: 18,
      humidity: 65,
      windSpeed: 12,
      pressure: 1013
    },
    hourly: hourly,
    sunrise: '06:45',
    sunset: '20:30',
    dayLength: 13.75 * 3600 // em segundos
  };
}