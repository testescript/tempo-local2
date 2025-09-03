// previsao.js - Dashboard Meteorológico Integrado

// Configurações
const LOCATIONS = {
  weather: { lat: 39.3605, lon: -9.1567, name: "oBIDOS" },
  tides: { lat: 39.3558, lon: -9.38112, name: "Baleal" }
};

// Helpers
const $ = (s) => document.querySelector(s);
const fmt = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit' });
const dateFmt = new Intl.DateTimeFormat('pt-PT', { 
  weekday: 'short', 
  day: 'numeric', 
  month: 'short', 
  hour: '2-digit', 
  minute: '2-digit' 
});

let unitC = true;
let charts = {};
let lastData = null;
let currentLocation = { ...LOCATIONS.weather };

// UI Safe setters
function safeText(sel, text) {
  const el = $(sel);
  if (el) el.textContent = text;
}

function setStatus(t) {
  safeText('#status', t);
}

function setUpdated() {
  safeText('#lastUpdate', 'Atualizado: ' + new Date().toLocaleTimeString('pt-PT'));
}

function showLoading(show) {
  const loader = $('#loadingIndicator');
  if (loader) loader.classList.toggle('active', show);
}

// Relógio
function tickClock() {
  safeText('#clock', new Date().toLocaleTimeString('pt-PT'));
}
setInterval(tickClock, 1000);
tickClock();

// Tema
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  document.documentElement.setAttribute('data-theme', savedTheme);
  const themeBtn = $('#themeToggle');
  if (themeBtn) {
    themeBtn.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
    });
  }
}

// Unidade
function initUnitToggle() {
  const savedUnit = localStorage.getItem('temperatureUnit') || 'c';
  unitC = savedUnit === 'c';
  const unitBtn = $('#unitToggle');
  if (unitBtn) {
    unitBtn.textContent = unitC ? '°C' : '°F';
    unitBtn.addEventListener('click', () => {
      unitC = !unitC;
      unitBtn.textContent = unitC ? '°C' : '°F';
      localStorage.setItem('temperatureUnit', unitC ? 'c' : 'f');
      if (lastData) renderAll(lastData);
    });
  }
}

function toF(c) {
  return (c * 9 / 5) + 32;
}

function maybeF(v) {
  return unitC ? v : toF(v);
}

// Eventos
function initEventListeners() {
  const fetchBtn = $('#btnFetch');
  if (fetchBtn) {
    fetchBtn.addEventListener('click', () => {
      fetchForecast(currentLocation.lat, currentLocation.lon);
    });
  }

  const cityInput = $('#city');
  if (cityInput) {
    cityInput.addEventListener('keydown', async (e) => {
      if (e.key === 'Enter') await geocodeCity(cityInput.value.trim());
    });
  }

  const rangeInput = $('#range');
  if (rangeInput) {
    rangeInput.addEventListener('change', () => {
      if (lastData) {
        const hours = parseInt(rangeInput.value, 10) || 48;
        renderAll(lastData, hours);
      }
    });
  }
}

// Geocodificação usando backend
async function geocodeCity(q) {
  if (!q) return;
  setStatus('A pesquisar cidade...');
  showLoading(true);

  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(q)}&count=1&language=pt&format=json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Geocoding falhou: ' + response.status);
    const js = await response.json();

    const coordsDisplay = $('#coords-display');

    if (js && js.results && js.results.length > 0) {
      const r = js.results[0];
      currentLocation = { lat: r.latitude, lon: r.longitude, name: r.name, country: r.country };
      safeText('#coords-display', `📍 ${currentLocation.name}, ${currentLocation.country} (${currentLocation.lat.toFixed(4)}, ${currentLocation.lon.toFixed(4)})`);
      setStatus(`Localização: ${r.name}, ${r.country}`);
      fetchForecast(r.latitude, r.longitude);
    } else {
      safeText('#coords-display', 'Localização não encontrada.');
      setStatus('Cidade não encontrada.');
    }
  } catch (e) {
    console.error('Erro na geocodificação:', e);
    safeText('#coords-display', 'Erro na pesquisa.');
    setStatus('Erro na pesquisa.');
  } finally {
    showLoading(false);
  }
}

// Gráficos helpers
function ensureCanvas(sel) {
  const el = document.querySelector(sel);
  if (!el) {
    console.warn('Canvas não encontrado:', sel);
    return null;
  }
  
  // IMPORTANTE: Resetar tamanho explicitamente
  el.style.height = '';
  el.style.width = '';
  el.height = 0;
  el.width = 0;
  
  // Limpar canvas
  const ctx = el.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, el.width, el.height);
  }
  
  return el;
}


function destroyChart(sel) {
  if (charts[sel]) {
    charts[sel].destroy();
    delete charts[sel];
  }
}

function spark(sel, labels, data, color) {
  const el = ensureCanvas(sel);
  if (!el) return;
  destroyChart(sel);
  charts[sel] = new Chart(el, {
    type: 'line',
    data: {
      labels,
      datasets: [{ data, borderWidth: 2, pointRadius: 0, borderColor: color, tension: 0.4, fill: false }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: { x: { display: false }, y: { display: false } },
      animation: { duration: 800 }
    }
  });
}

function line(sel, labels, data, label, unit, color) {
  const el = ensureCanvas(sel);
  if (!el) return;
  
  destroyChart(sel);
  
  try {
    charts[sel] = new Chart(el, {
      type: 'line',
      data: {
        labels,
        datasets: [{ 
          label: `${label} (${unit})`, 
          data, 
          tension: 0.3, 
          borderWidth: 2, 
          pointRadius: 0,
          borderColor: color, 
          backgroundColor: color + '20', 
          fill: true 
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // CRÍTICO!
        layout: {
          padding: 0
        },
        scales: {
          x: { 
            type: 'time',
            time: { 
              unit: 'hour', 
              displayFormats: { hour: 'HH:mm' }
            },
            grid: { display: false },
            ticks: { maxTicksLimit: 6 }
          },
          y: { 
            beginAtZero: false,
            grid: { color: 'rgba(0,0,0,0.1)' },
            ticks: { maxTicksLimit: 5 }
          }
        },
        plugins: {
          legend: { display: false },
          tooltip: { 
            mode: 'index', 
            intersect: false,
            animation: false
          }
        },
        animation: {
          duration: 0 // SEM animação para evitar bugs
        }
      }
    });
  } catch (e) {
    console.error('Erro ao criar gráfico:', sel, e);
  }
}

function bar(sel, labels, data, label, unit, color) {
  const el = ensureCanvas(sel);
  if (!el) return;
  
  destroyChart(sel);
  
  try {
    charts[sel] = new Chart(el, {
      type: 'bar',
      data: {
        labels,
        datasets: [{ 
          label: `${label} (${unit})`, 
          data, 
          backgroundColor: color + '60', 
          borderColor: color, 
          borderWidth: 1 
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // CRÍTICO!
        layout: {
          padding: 0
        },
        scales: {
          x: { 
            type: 'time',
            time: { 
              unit: 'hour',
              displayFormats: { hour: 'HH:mm' }
            },
            grid: { display: false },
            ticks: { maxTicksLimit: 6 }
          },
          y: { 
            beginAtZero: true,
            max: 100,
            ticks: { maxTicksLimit: 5 }
          }
        },
        plugins: {
          legend: { display: false }
        },
        animation: {
          duration: 0 // SEM animação
        }
      }
    });
  } catch (e) {
    console.error('Erro ao criar gráfico bar:', sel, e);
  }
}

function spark(sel, labels, data, color) {
  const el = ensureCanvas(sel);
  if (!el) return;
  
  destroyChart(sel);
  
  try {
    charts[sel] = new Chart(el, {
      type: 'line',
      data: {
        labels,
        datasets: [{ 
          data, 
          borderWidth: 2, 
          pointRadius: 0, 
          borderColor: color, 
          tension: 0.4, 
          fill: false 
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false, // CRÍTICO!
        layout: {
          padding: 0
        },
        plugins: { legend: { display: false } },
        scales: { x: { display: false }, y: { display: false } },
        animation: { duration: 0 }
      }
    });
  } catch (e) {
    console.error('Erro ao criar sparkline:', sel, e);
  }
}

// *** FUNÇÃO CORRIGIDA PARA LIDAR COM AMBOS OS FORMATOS ***
function normalizeWeatherData(rawData) {
  // Se os dados já vêm do backend (formato: {hourly: [{dt, temp, humidity, ...}]})
  if (rawData.hourly && Array.isArray(rawData.hourly) && rawData.hourly[0]?.dt) {
    console.log('📊 Usando formato do backend (processado)');
    return {
      hourly: {
        time: rawData.hourly.map(item => new Date(item.dt * 1000).toISOString()),
        temperature_2m: rawData.hourly.map(item => item.temp || 0),
        relative_humidity_2m: rawData.hourly.map(item => item.humidity || 0),
        wind_speed_10m: rawData.hourly.map(item => item.wind_speed || 0),
        precipitation_probability: rawData.hourly.map(item => (item.pop || 0) * 100),
        pressure_msl: rawData.hourly.map(item => item.pressure || 0),
        uv_index: rawData.hourly.map(item => 0) // Backend não inclui UV
      },
      daily: {
        uv_index_max: [0] // Fallback para UV
      }
    };
  }
  
  // Se os dados vêm direto do Open-Meteo (formato original)
  if (rawData.hourly && rawData.hourly.time && Array.isArray(rawData.hourly.time)) {
    console.log('🌤️ Usando formato do Open-Meteo (direto)');
    return rawData;
  }
  
  // Dados inválidos
  throw new Error('Formato de dados não reconhecido');
}

// Renderização CORRIGIDA
function renderAll(rawData, hours = 48) {
  try {
    // Normalizar dados para formato padrão
    const j = normalizeWeatherData(rawData);
    
    if (!j || !j.hourly || !j.hourly.time) {
      throw new Error('Dados normalizados inválidos');
    }

    const time = j.hourly.time.map(t => new Date(t));
    const take = Math.min(hours, time.length);
    const idx = [...Array(take).keys()];

    const T = idx.map(i => maybeF(j.hourly.temperature_2m[i] || 0));
    const H = idx.map(i => j.hourly.relative_humidity_2m[i] || 0);
    const W = idx.map(i => j.hourly.wind_speed_10m[i] || 0);
    const P = idx.map(i => j.hourly.precipitation_probability[i] || 0);
    const PR = idx.map(i => j.hourly.pressure_msl[i] || 0);
    const UV = idx.map(i => j.hourly.uv_index ? j.hourly.uv_index[i] || 0 : 0);
    const tLabels = idx.map(i => time[i]);

    // KPIs
    safeText('#kpiTemp', (T[0] != null ? Math.round(T[0]) : '--') + (unitC ? '°C' : '°F'));
    safeText('#kpiHum', (H[0] != null ? Math.round(H[0]) : '--') + '%');
    safeText('#kpiWind', (W[0] != null ? Math.round(W[0]) : '--') + ' m/s');
    safeText('#kpiPress', (PR[0] != null ? Math.round(PR[0]) : '--') + ' hPa');

    const uvValue = j.daily && j.daily.uv_index_max ? j.daily.uv_index_max[0] : null;
    safeText('#kpiUV', (uvValue != null ? Math.round(uvValue) : '--'));

    // Sparklines
    spark('#sparkTemp', tLabels, T, '#ff6384');
    spark('#sparkHum', tLabels, H, '#36a2eb');
    spark('#sparkWind', tLabels, W, '#ffce56');
    spark('#sparkPress', tLabels, PR, '#4bc0c0');
    spark('#sparkUV', tLabels, UV, '#9966ff');

    // Gráficos completos
    line('#chartTemp', tLabels, T, 'Temperatura', unitC ? '°C' : '°F', '#ff6384');
    line('#chartHum', tLabels, H, 'Humidade', '%', '#36a2eb');
    line('#chartWind', tLabels, W, 'Vento', 'm/s', '#ffce56');
    bar('#chartPop', tLabels, P, 'Precipitação', '%', '#36a2eb');
    line('#chartPress', tLabels, PR, 'Pressão', 'hPa', '#4bc0c0');
    line('#chartUV', tLabels, UV, 'UV', 'index', '#9966ff');

    // Previsão horária
    const hourly = $('#hourly');
    if (hourly) {
      hourly.innerHTML = '';
      for (let i = 0; i < take; i += 3) { // De 3 em 3 horas
        const card = document.createElement('div');
        card.className = 'forecast-card';
        card.innerHTML = `
          <div><strong>${fmt.format(time[i])}</strong></div>
          <div>${Math.round(T[i])}${unitC ? '°C' : '°F'}</div>
          <div>${Math.round(H[i])}% 💧</div>
          <div>${Math.round(W[i])} m/s 💨</div>
          <div>${Math.round(P[i])}% 🌧️</div>
        `;
        hourly.appendChild(card);
      }
    }
    setUpdated();
    
  } catch (error) {
    console.error('Erro na renderização:', error);
    setStatus('Erro ao processar dados meteorológicos');
  }
}

// Buscar previsão CORRIGIDA
async function fetchForecast(lat, lon) {
  setStatus('A carregar dados...');
  showLoading(true);
  
  try {
    // 1. Tentar usar o backend primeiro
    console.log('🔄 Tentando backend...');
    let url = `/api/openmeteo?lat=${lat}&lon=${lon}&hours=48`;
    let response = await fetch(url);
    
    if (response.ok) {
      console.log('✅ Backend funcionou');
      lastData = await response.json();
      renderAll(lastData);
      setStatus('Dados carregados do servidor interno.');
      return;
    }
    
    // 2. Fallback para Open-Meteo direto
    console.log('🌤️ Fallback para Open-Meteo direto...');
    url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation_probability,pressure_msl,uv_index&daily=uv_index_max&timezone=Europe/Lisbon`;
    response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`Open-Meteo error: ${response.status}`);
    }
    
    console.log('✅ Open-Meteo direto funcionou');
    lastData = await response.json();
    renderAll(lastData);
    setStatus('Dados carregados do Open-Meteo.');
    
  } catch (e) {
    console.error('❌ Erro na busca:', e);
    setStatus(`Erro ao carregar dados: ${e.message}`);
  } finally {
    showLoading(false);
  }
}

// Inicialização
function init() {
  console.log('🚀 Inicializando Dashboard Meteorológico...');
  initTheme();
  initUnitToggle();
  initEventListeners();
  fetchForecast(currentLocation.lat, currentLocation.lon);
}

window.addEventListener('load', init);