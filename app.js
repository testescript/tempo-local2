// script.js

// As configurações serão carregadas automaticamente do window.CONFIG
// definido no arquivo config.js
const {
  API_KEYS,
  DEFAULT_LOCATIONS, 
  VIEW_CONFIG,
  WEATHER_ICONS,
  CHART_COLORS,
  MAP_CONFIG
} = window.CONFIG || {};

// Variáveis globais
let currentView = 'current';
let currentUnit = 'c';
let charts = {};
let weatherData = null;
let map = null;
let marker = null;
let updateInterval = null;

// Inicialização quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  setCurrentYear();
});

// Configuração inicial do aplicativo
function initializeApp() {
  initializeTheme();
  initializeUnits();
  initializeEventListeners();
  initializeMap();
  loadWeatherData();
  startClock();
}

// Inicializar o tema com base nas preferências salvas ou do sistema
function initializeTheme() {
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
  
  document.documentElement.setAttribute('data-theme', theme);
  updateThemeButtonIcon(theme);
}

// Inicializar unidades de medida
function initializeUnits() {
  const savedUnit = localStorage.getItem('temperatureUnit') || 'c';
  currentUnit = savedUnit;
  updateUnitButton();
}

// Configurar todos os event listeners
function initializeEventListeners() {
  // Botões de controle
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('unitToggle').addEventListener('click', toggleUnits);
  document.getElementById('btnRefresh').addEventListener('click', loadWeatherData);
  
  // Pesquisa de cidade
  document.getElementById('btnSearch').addEventListener('click', searchCity);
  document.getElementById('citySearch').addEventListener('keypress', function(e) {
    if (e.key === 'Enter') searchCity();
  });
  
  // Seletor de visualização
  document.getElementById('viewSelector').addEventListener('change', function(e) {
    currentView = e.target.value;
    updateView();
  });
  
  // Seletor de horas
  document.getElementById('hoursSelector').addEventListener('change', function() {
    if (weatherData) {
      renderHourlyForecast(weatherData);
    }
  });
  
  // Controles de gráficos
  document.querySelectorAll('.chart-toggle').forEach(button => {
    button.addEventListener('click', function() {
      const chartType = this.dataset.chart;
      switchChart(chartType);
    });
  });
}

// Inicializar o mapa Leaflet
function initializeMap() {
  map = L.map('map').setView([
    DEFAULT_LOCATIONS.weather.lat, 
    DEFAULT_LOCATIONS.weather.lon
  ], MAP_CONFIG.zoom);
  
  L.tileLayer(MAP_CONFIG.tileLayer, {
    attribution: MAP_CONFIG.attribution,
    maxZoom: MAP_CONFIG.maxZoom
  }).addTo(map);
}

// Carregar dados meteorológicos
async function loadWeatherData() {
  showLoading(true);
  
  try {
    const weatherPromises = [
      fetchOpenMeteoData(),
      fetchOpenWeatherData()
    ];
    
    if (API_KEYS.STORMGLASS) {
      weatherPromises.push(fetchWaveData());
    }
    
    const results = await Promise.allSettled(weatherPromises);
    
    // Processar resultados
    weatherData = {
      openMeteo: results[0].status === 'fulfilled' ? results[0].value : null,
      openWeather: results[1].status === 'fulfilled' ? results[1].value : null,
      stormglass: results[2] && results[2].status === 'fulfilled' ? results[2].value : null
    };
    
    renderAllData();
    
  } catch (error) {
    console.error('Erro ao carregar dados:', error);
    showError('Falha ao carregar dados meteorológicos');
  } finally {
    showLoading(false);
    scheduleNextUpdate();
  }
}

// Buscar dados do Open-Meteo
async function fetchOpenMeteoData() {
  const { lat, lon } = DEFAULT_LOCATIONS.weather;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,wind_speed_10m,pressure_msl,uv_index&daily=sunrise,sunset,daylight_duration,uv_index_max&timezone=auto&forecast_days=7`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('Open-Meteo API error');
  
  return await response.json();
}

// Buscar dados do OpenWeather
async function fetchOpenWeatherData() {
  if (!API_KEYS.OPENWEATHER) throw new Error('OpenWeather API key not configured');
  
  const { lat, lon } = DEFAULT_LOCATIONS.weather;
  const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${lat}&lon=${lon}&appid=${API_KEYS.OPENWEATHER}&units=metric&lang=pt`;
  
  const response = await fetch(url);
  if (!response.ok) throw new Error('OpenWeather API error');
  
  return await response.json();
}

// Buscar dados de ondas do StormGlass
async function fetchWaveData() {
  if (!API_KEYS.STORMGLASS) throw new Error('StormGlass API key not configured');
  
  const { lat, lon } = DEFAULT_LOCATIONS.tides;
  const params = ['waveHeight', 'waterTemperature'].join(',');
  const url = `https://api.stormglass.io/v2/weather/point?lat=${lat}&lng=${lon}&params=${params}`;
  
  const response = await fetch(url, {
    headers: { 'Authorization': API_KEYS.STORMGLASS }
  });
  
  if (!response.ok) throw new Error('StormGlass API error');
  
  return await response.json();
}

// Renderizar todos os dados no dashboard
function renderAllData() {
  if (!weatherData.openMeteo) return;
  
  renderCurrentConditions();
  renderHourlyForecast();
  renderWeeklyForecast();
  renderSunInfo();
  renderCharts();
  updateMap();
  
  if (weatherData.openWeather) {
    renderAlerts();
  }
  
  document.getElementById('updateTime').textContent = new Date().toLocaleTimeString();
}

// Renderizar condições atuais
function renderCurrentConditions() {
  const { openMeteo, openWeather } = weatherData;
  if (!openMeteo) return;
  
  const current = openMeteo.hourly;
  const currentTemp = convertTemperature(current.temperature_2m[0]);
  
  // Atualizar temperatura principal
  document.getElementById('currentTemp').textContent = `${currentTemp}°`;
  
  // Atualizar outros valores
  document.getElementById('currentHumidity').textContent = `${current.relative_humidity_2m[0]}%`;
  document.getElementById('currentWind').textContent = `${current.wind_speed_10m[0]} km/h`;
  document.getElementById('currentPressure').textContent = `${current.pressure_msl[0]} hPa`;
  document.getElementById('currentUV').textContent = openMeteo.daily.uv_index_max[0];
  
  // Atualizar ícone do clima (se disponível dos dados do OpenWeather)
  const weatherIcon = document.getElementById('weatherIcon');
  if (openWeather && openWeather.current && openWeather.current.weather) {
    const iconCode = openWeather.current.weather[0].icon;
    weatherIcon.innerHTML = `<i class="${WEATHER_ICONS[iconCode] || WEATHER_ICONS.clear}"></i>`;
  } else {
    weatherIcon.innerHTML = '<i class="fas fa-cloud"></i>';
  }
}

// Renderizar previsão horária
function renderHourlyForecast() {
  const { openMeteo, openWeather } = weatherData;
  if (!openMeteo) return;
  
  const hours = parseInt(document.getElementById('hoursSelector').value);
  const hourlyContainer = document.getElementById('hourlyContainer');
  hourlyContainer.innerHTML = '';
  
  const now = new Date();
  const currentHour = now.getHours();
  
  for (let i = 0; i < hours && i < openMeteo.hourly.time.length; i++) {
    const time = new Date(openMeteo.hourly.time[i]);
    const hour = time.getHours();
    
    // Pular horas passadas
    if (time < now && hour !== currentHour) continue;
    
    const temp = convertTemperature(openMeteo.hourly.temperature_2m[i]);
    const precip = openMeteo.hourly.precipitation_probability[i];
    
    // Determinar ícone com base na probabilidade de precipitação
    let iconClass = WEATHER_ICONS.clear;
    if (precip > 70) iconClass = WEATHER_ICONS.rain;
    else if (precip > 30) iconClass = WEATHER_ICONS['partly-cloudy'];
    
    const hourElement = document.createElement('div');
    hourElement.className = 'hour-item';
    hourElement.innerHTML = `
      <div class="hour-time">${formatTime(time)}</div>
      <div class="hour-icon"><i class="${iconClass}"></i></div>
      <div class="hour-temp">${temp}°</div>
      <div class="hour-precip">${precip}%</div>
    `;
    
    hourlyContainer.appendChild(hourElement);
  }
}

// Renderizar previsão semanal
function renderWeeklyForecast() {
  const { openMeteo } = weatherData;
  if (!openMeteo || !openMeteo.daily) return;
  
  const weeklyContainer = document.getElementById('weeklyContainer');
  weeklyContainer.innerHTML = '';
  
  const days = openMeteo.daily.time.length;
  const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  
  for (let i = 0; i < days; i++) {
    const date = new Date(openMeteo.daily.time[i]);
    const dayName = dayNames[date.getDay()];
    const high = convertTemperature(openMeteo.daily.temperature_2m_max[i]);
    const low = convertTemperature(openMeteo.daily.temperature_2m_min[i]);
    const precip = openMeteo.daily.precipitation_probability_max[i] || 0;
    
    const dayElement = document.createElement('div');
    dayElement.className = 'day-item';
    dayElement.innerHTML = `
      <div class="day-name">${i === 0 ? 'Hoje' : dayName}</div>
      <div class="day-icon"><i class="${precip > 50 ? WEATHER_ICONS.rain : WEATHER_ICONS.clear}"></i></div>
      <div class="day-temps">
        <span class="day-high">${high}°</span>
        <span class="day-low">${low}°</span>
      </div>
      <div class="day-precip">${precip}%</div>
    `;
    
    weeklyContainer.appendChild(dayElement);
  }
}

// Renderizar informações do sol
function renderSunInfo() {
  const { openMeteo } = weatherData;
  if (!openMeteo || !openMeteo.daily) return;
  
  const sunrise = new Date(openMeteo.daily.sunrise[0]);
  const sunset = new Date(openMeteo.daily.sunset[0]);
  const daylight = openMeteo.daily.daylight_duration[0];
  
  const hours = Math.floor(daylight / 3600);
  const minutes = Math.floor((daylight % 3600) / 60);
  
  document.getElementById('sunriseTime').textContent = formatTime(sunrise);
  document.getElementById('sunsetTime').textContent = formatTime(sunset);
  document.getElementById('daylightDuration').textContent = `${hours}h ${minutes}m`;
}

// Renderizar gráficos
function renderCharts() {
  const { openMeteo } = weatherData;
  if (!openMeteo) return;
  
  // Destruir gráficos existentes
  Object.values(charts).forEach(chart => chart.destroy());
  charts = {};
  
  // Criar dados para os gráficos
  const hours = 24;
  const labels = openMeteo.hourly.time.slice(0, hours).map(time => 
    new Date(time).toLocaleTimeString([], { hour: '2-digit' })
  );
  
  const temperatureData = openMeteo.hourly.temperature_2m.slice(0, hours);
  const precipitationData = openMeteo.hourly.precipitation_probability.slice(0, hours);
  const windData = openMeteo.hourly.wind_speed_10m.slice(0, hours);
  
  // Configuração do gráfico
  const ctx = document.getElementById('mainChart').getContext('2d');
  charts.main = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Temperatura (°C)',
        data: temperatureData,
        borderColor: CHART_COLORS.temperature.line,
        backgroundColor: CHART_COLORS.temperature.fill,
        tension: 0.3,
        fill: true,
        yAxisID: 'y'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: false,
          position: 'left',
        }
      }
    }
  });
  
  // Ativar o primeiro botão de gráfico
  document.querySelector('.chart-toggle').classList.add('active');
}

// Renderizar alertas
function renderAlerts() {
  const { openWeather } = weatherData;
  const alertsContainer = document.getElementById('alertsContainer');
  
  if (!openWeather || !openWeather.alerts || openWeather.alerts.length === 0) {
    alertsContainer.innerHTML = `
      <div class="no-alerts">
        <i class="fas fa-check-circle"></i>
        <p>Nenhum alerta meteorológico ativo</p>
      </div>
    `;
    return;
  }
  
  alertsContainer.innerHTML = '';
  openWeather.alerts.forEach(alert => {
    const start = new Date(alert.start * 1000);
    const end = new Date(alert.end * 1000);
    
    const alertElement = document.createElement('div');
    alertElement.className = 'alert-item';
    alertElement.innerHTML = `
      <h3>${alert.event}</h3>
      <p>${alert.description}</p>
      <div class="alert-time">De ${formatDateTime(start)} até ${formatDateTime(end)}</div>
    `;
    
    alertsContainer.appendChild(alertElement);
  });
}

// Atualizar o mapa com a localização atual
function updateMap() {
  const { lat, lon } = DEFAULT_LOCATIONS.weather;
  
  if (marker) {
    map.removeLayer(marker);
  }
  
  map.setView([lat, lon], MAP_CONFIG.zoom);
  marker = L.marker([lat, lon]).addTo(map);
  marker.bindPopup(`<b>${DEFAULT_LOCATIONS.weather.name}</b><br>Monitoramento climático`).openPopup();
}

// Alternar entre temas claro e escuro
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.documentElement.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
  updateThemeButtonIcon(newTheme);
}

// Alternar entre unidades Celsius e Fahrenheit
function toggleUnits() {
  currentUnit = currentUnit === 'c' ? 'f' : 'c';
  localStorage.setItem('temperatureUnit', currentUnit);
  updateUnitButton();
  
  if (weatherData) {
    renderAllData();
  }
}

// Pesquisar cidade
async function searchCity() {
  const query = document.getElementById('citySearch').value.trim();
  if (!query) return;
  
  showLoading(true);
  
  try {
    const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=pt`);
    const data = await response.json();
    
    if (data.results && data.results.length > 0) {
      const city = data.results[0];
      DEFAULT_LOCATIONS.weather = {
        lat: city.latitude,
        lon: city.longitude,
        name: city.name,
        country: city.country_code
      };
      
      document.getElementById('currentLocation').textContent = `${city.name}, ${city.country_code}`;
      loadWeatherData();
    } else {
      showError('Cidade não encontrada');
    }
  } catch (error) {
    console.error('Erro na pesquisa:', error);
    showError('Erro ao buscar cidade');
  }
}

// Atualizar visualização com base na seleção
function updateView() {
  // Esconder todos os widgets primeiro
  document.querySelectorAll('[data-widget]').forEach(widget => {
    widget.style.display = 'none';
  });
  
  // Mostrar widgets relevantes para a visualização atual
  if (currentView === 'current') {
    document.querySelector('[data-widget="current"]').style.display = 'block';
    document.querySelector('[data-widget="hourly"]').style.display = 'block';
    document.querySelector('[data-widget="sun"]').style.display = 'block';
  } else if (currentView === 'today') {
    document.querySelector('[data-widget="current"]').style.display = 'block';
    document.querySelector('[data-widget="hourly"]').style.display = 'block';
    document.querySelector('[data-widget="charts"]').style.display = 'block';
    document.querySelector('[data-widget="sun"]').style.display = 'block';
  } else if (currentView === 'week') {
    document.querySelector('[data-widget="weekly"]').style.display = 'block';
    document.querySelector('[data-widget="charts"]').style.display = 'block';
  }
  
  // Widgets que sempre são mostrados
  document.querySelector('[data-widget="map"]').style.display = 'block';
  document.querySelector('[data-widget="alerts"]').style.display = 'block';
}

// Alternar entre tipos de gráficos
function switchChart(chartType) {
  // Atualizar botões ativos
  document.querySelectorAll('.chart-toggle').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-chart="${chartType}"]`).classList.add('active');
  
  const { openMeteo } = weatherData;
  if (!openMeteo || !charts.main) return;
  
  const hours = 24;
  const labels = openMeteo.hourly.time.slice(0, hours).map(time => 
    new Date(time).toLocaleTimeString([], { hour: '2-digit' })
  );
  
  let newDataset;
  
  switch (chartType) {
    case 'temperature':
      newDataset = {
        label: 'Temperatura (°C)',
        data: openMeteo.hourly.temperature_2m.slice(0, hours),
        borderColor: CHART_COLORS.temperature.line,
        backgroundColor: CHART_COLORS.temperature.fill,
        tension: 0.3,
        fill: true,
        yAxisID: 'y'
      };
      break;
      
    case 'precipitation':
      newDataset = {
        label: 'Precipitação (%)',
        data: openMeteo.hourly.precipitation_probability.slice(0, hours),
        borderColor: CHART_COLORS.precipitation.line,
        backgroundColor: CHART_COLORS.precipitation.fill,
        tension: 0.3,
        fill: true,
        yAxisID: 'y'
      };
      break;
      
    case 'wind':
      newDataset = {
        label: 'Velocidade do Vento (km/h)',
        data: openMeteo.hourly.wind_speed_10m.slice(0, hours),
        borderColor: CHART_COLORS.wind.line,
        backgroundColor: CHART_COLORS.wind.fill,
        tension: 0.3,
        fill: true,
        yAxisID: 'y'
      };
      break;
  }
  
  charts.main.data.labels = labels;
  charts.main.data.datasets = [newDataset];
  charts.main.update();
}

// Mostrar/ocultar loading
function showLoading(show) {
  document.getElementById('loadingIndicator').classList.toggle('active', show);
}

// Mostrar mensagem de erro
function showError(message) {
  // Implementar uma notificação de erro mais robusta
  console.error(message);
  setStatus(message);
}

// Atualizar texto de status
function setStatus(text) {
  document.getElementById('status').textContent = text;
}

// Agendar próxima atualização
function scheduleNextUpdate() {
  if (updateInterval) {
    clearTimeout(updateInterval);
  }
  
  const interval = VIEW_CONFIG[currentView].updateInterval;
  updateInterval = setTimeout(loadWeatherData, interval);
}

// Iniciar relógio
function startClock() {
  setInterval(() => {
    document.getElementById('clock').textContent = new Date().toLocaleTimeString();
  }, 1000);
}

// Atualizar ícone do botão de tema
function updateThemeButtonIcon(theme) {
  const icon = document.querySelector('#themeToggle i');
  icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
}

// Atualizar texto do botão de unidades
function updateUnitButton() {
  document.getElementById('unitToggle').textContent = currentUnit === 'c' ? '°C' : '°F';
}

// Converter temperatura com base na unidade selecionada
function convertTemperature(celsius) {
  if (currentUnit === 'c') return Math.round(celsius);
  return Math.round((celsius * 9/5) + 32);
}

// Formatar hora
function formatTime(date) {
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

// Formatar data e hora
function formatDateTime(date) {
  return date.toLocaleString([], { 
    day: '2-digit', 
    month: '2-digit', 
    year: 'numeric',
    hour: '2-digit', 
    minute: '2-digit' 
  });
}

// Definir ano atual no footer
function setCurrentYear() {
  document.getElementById('footerYear').textContent = new Date().getFullYear();
}

// Exportar para uso em outros arquivos (se necessário)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    initializeApp,
    loadWeatherData,
    toggleTheme,
    toggleUnits
  };
}