// previsao.js
let tempChart;
let precipChart;

// Configurações iniciais
const LAT = 39.3581;
const LON = -9.1579;
let userTheme = localStorage.getItem('theme') || 'light';

// Alternar tema
function setupThemeToggle() {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
      
      document.documentElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      
      const icon = newTheme === 'dark' ? 'fa-sun' : 'fa-moon';
      const text = newTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro';
      themeToggle.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
      
      userTheme = newTheme;
      updateChartThemes();
    });
    
    // Inicializar texto do botão
    const icon = userTheme === 'dark' ? 'fa-sun' : 'fa-moon';
    const text = userTheme === 'dark' ? 'Modo Claro' : 'Modo Escuro';
    themeToggle.innerHTML = `<i class="fas ${icon}"></i> ${text}`;
  }
}

// Atualizar temas dos gráficos
function updateChartThemes() {
  const isDark = userTheme === 'dark';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  const textColor = isDark ? '#ecf0f1' : '#2c3e50';
  
  if (tempChart) {
    tempChart.options.scales.x.ticks.color = textColor;
    tempChart.options.scales.x.grid.color = gridColor;
    tempChart.options.scales['y-temp'].ticks.color = textColor;
    tempChart.options.scales['y-temp'].grid.color = gridColor;
    tempChart.options.scales['y-hum'].ticks.color = textColor;
    tempChart.options.scales['y-hum'].grid.color = gridColor;
    tempChart.update();
  }
  
  if (precipChart) {
    precipChart.options.scales.x.ticks.color = textColor;
    precipChart.options.scales.x.grid.color = gridColor;
    precipChart.options.scales['y-precip'].ticks.color = textColor;
    precipChart.options.scales['y-precip'].grid.color = gridColor;
    precipChart.options.scales['y-wind'].ticks.color = textColor;
    precipChart.options.scales['y-wind'].grid.color = gridColor;
    precipChart.update();
  }
}

// Atualizar timestamp
function updateTimestamp() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('pt-PT');
  const updateElement = document.getElementById('update-time');
  if (updateElement) {
    updateElement.textContent = timeString;
  }
}

// Obter ícone do tempo com base no código meteorológico
function getWeatherIcon(code) {
  const codeMap = {
    0: '☀️',   // Clear sky
    1: '🌤️',   // Mainly clear
    2: '⛅',   // Partly cloudy
    3: '☁️',   // Overcast
    45: '🌫️',  // Fog
    48: '🌫️',  // Depositing rime fog
    51: '🌧️',  // Drizzle: Light
    53: '🌧️',  // Drizzle: Moderate
    55: '🌧️',  // Drizzle: Dense
    61: '🌧️',  // Rain: Slight
    63: '🌧️',  // Rain: Moderate
    65: '🌧️',  // Rain: Heavy
    80: '🌧️',  // Rain showers: Slight
    81: '🌧️',  // Rain showers: Moderate
    82: '🌧️',  // Rain showers: Violent
    95: '⛈️',   // Thunderstorm: Slight or moderate
    96: '⛈️',   // Thunderstorm with slight hail
    99: '⛈️'    // Thunderstorm with heavy hail
  };
  
  return codeMap[code] || '☁️';
}

async function carregarPrevisao() {
  const PREVISAO_URL = 'http://localhost:3001/api/weather/forecast';
  try {
    const response = await fetch(PREVISAO_URL);
    
    if (!response.ok) {
      throw new Error(`Erro de rede: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    if (!data || !data.hourly) {
      throw new Error('Dados de previsão não disponíveis.');
    }

    const hourlyData = data.hourly.slice(0, 24); // Próximas 24 horas

    const labels = hourlyData.map(hour => {
      const date = new Date(hour.dt * 1000);
      return `${date.getHours()}:00`;
    });
    
    const tempData = hourlyData.map(hour => hour.temp);
    const humidityData = hourlyData.map(hour => hour.humidity);
    const popData = hourlyData.map(hour => (hour.pop * 100).toFixed(0)); // Chance de precipitação
    const windData = hourlyData.map(hour => hour.wind_speed);
    const weatherCodes = hourlyData.map(hour => hour.weather[0].id);

    criarGraficoTemperaturaHumidade(labels, tempData, humidityData);
    criarGraficoPrecipitacaoVento(labels, popData, windData);
    criarPrevisaoHoraria(hourlyData, weatherCodes);

    updateTimestamp();

  } catch (error) {
    console.error('Erro ao carregar dados de previsão:', error);
    document.querySelector('main').innerHTML = `<h1>Erro ao carregar dados de previsão</h1><p>${error.message}</p>`;
  }
}

function criarGraficoTemperaturaHumidade(labels, tempData, humidityData) {
  const isDark = userTheme === 'dark';
  const textColor = isDark ? '#ecf0f1' : '#2c3e50';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  
  const ctx = document.getElementById('tempChart').getContext('2d');
  if (tempChart) tempChart.destroy();
  
  tempChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: 'Temperatura (°C)',
        data: tempData,
        borderColor: 'rgb(255, 99, 132)',
        backgroundColor: 'rgba(255, 99, 132, 0.2)',
        yAxisID: 'y-temp',
        tension: 0.3,
        fill: true
      }, {
        label: 'Humidade (%)',
        data: humidityData,
        borderColor: 'rgb(54, 162, 235)',
        backgroundColor: 'rgba(54, 162, 235, 0.2)',
        yAxisID: 'y-hum',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        },
        'y-temp': {
          position: 'left',
          title: { 
            display: true, 
            text: 'Temperatura (°C)',
            color: textColor
          },
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        },
        'y-hum': {
          position: 'right',
          title: { 
            display: true, 
            text: 'Humidade (%)',
            color: textColor
          },
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor,
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

function criarGraficoPrecipitacaoVento(labels, popData, windData) {
  const isDark = userTheme === 'dark';
  const textColor = isDark ? '#ecf0f1' : '#2c3e50';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
  
  const ctx = document.getElementById('precipChart').getContext('2d');
  if (precipChart) precipChart.destroy();
  
  precipChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label: 'Chuva (%)',
        data: popData,
        backgroundColor: 'rgba(0, 123, 255, 0.5)',
        yAxisID: 'y-precip'
      }, {
        label: 'Vento (m/s)',
        data: windData,
        type: 'line',
        borderColor: 'rgb(75, 192, 192)',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        yAxisID: 'y-wind',
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: {
            color: textColor
          }
        },
        tooltip: {
          mode: 'index',
          intersect: false
        }
      },
      scales: {
        x: {
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        },
        'y-precip': {
          position: 'left',
          title: { 
            display: true, 
            text: 'Chance de Precipitação (%)',
            color: textColor
          },
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor
          }
        },
        'y-wind': {
          position: 'right',
          title: { 
            display: true, 
            text: 'Vento (m/s)',
            color: textColor
          },
          ticks: {
            color: textColor
          },
          grid: {
            color: gridColor,
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

function criarPrevisaoHoraria(hourlyData, weatherCodes) {
  const hourlyForecast = document.getElementById('hourly-forecast');
  if (!hourlyForecast) return;
  
  let html = '';
  
  hourlyData.forEach((hour, index) => {
    const date = new Date(hour.dt * 1000);
    const hourStr = `${date.getHours()}:00`;
    const icon = getWeatherIcon(weatherCodes[index]);
    
    html += `
      <div class="hour-card">
        <div class="hour">${hourStr}</div>
        <div class="weather-icon">${icon}</div>
        <div class="temp">${Math.round(hour.temp)}°C</div>
        <div class="humidity">${hour.humidity}%</div>
        <div class="precip">${Math.round(hour.pop * 100)}%</div>
      </div>
    `;
  });
  
  hourlyForecast.innerHTML = html;
}

// Inicializar a página
document.addEventListener('DOMContentLoaded', () => {
  // Aplicar tema salvo
  document.documentElement.setAttribute('data-theme', userTheme);
  
  // Configurar botão de tema
  setupThemeToggle();
  
  // Carregar previsão
  carregarPrevisao();
  
  // Atualizar a cada 15 minutos
  setInterval(carregarPrevisao, 15 * 60 * 1000);
});