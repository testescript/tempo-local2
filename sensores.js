// senores.js
const HISTORY_URL = 'http://localhost:3001/api/thingspeak?results=100';

let chartTempAHT;
let pressureChart;

// Função para buscar dados
async function fetchThingSpeak() {
    try {
        const cache = localStorage.getItem('sensors');
        if (cache) {
            const cachedData = JSON.parse(cache);
            if (Date.now() - cachedData.timestamp < 5 * 60 * 1000) {
                updateSensors(cachedData.data);
                return;
            }
        }

        const res = await fetch(HISTORY_URL);
        if (!res.ok) {
            throw new Error(`Erro de rede: ${res.statusText}`);
        }
        const data = await res.json();
        const feeds = data.feeds;

        if (!feeds || feeds.length === 0) {
            throw new Error('Sem dados do ThingSpeak');
        }

        updateSensors(feeds);
        localStorage.setItem('sensors', JSON.stringify({ data: feeds, timestamp: Date.now() }));
    } catch (error) {
        console.error('Erro ao obter dados do ThingSpeak:', error);
        document.getElementById('tempAHT').textContent = '-- °C';
        document.getElementById('humidityAHT').textContent = '-- %';
        document.getElementById('pressureBMP').textContent = '-- hPa';
        document.getElementById('tempBMP').textContent = '-- °C';
    }
}

// Função para atualizar os valores dos sensores e criar os gráficos
function updateSensors(feeds) {
    const latest = feeds[feeds.length - 1];
    if (latest) {
      document.getElementById('tempAHT').textContent = `${parseFloat(latest.field1).toFixed(2)} °C`;
      document.getElementById('humidityAHT').textContent = `${parseFloat(latest.field2).toFixed(2)} %`;
      document.getElementById('pressureBMP').textContent = `${parseFloat(latest.field3).toFixed(2)} hPa`;
      document.getElementById('tempBMP').textContent = `${parseFloat(latest.field4).toFixed(2)} °C`;
    }

    const labels = feeds.map(f => new Date(f.created_at).toLocaleTimeString('pt-PT'));
    const tempAHTData = feeds.map(f => parseFloat(f.field1));
    const humidityAHTData = feeds.map(f => parseFloat(f.field2));
    const pressureBMPData = feeds.map(f => parseFloat(f.field3));
    
    // Chamadas para criar os gráficos
    criarGraficoTempUmidade(labels, tempAHTData, humidityAHTData);
    criarGraficoPressao(labels, pressureBMPData);
}

// Função para criar o gráfico de Temperatura e Humidade
function criarGraficoTempUmidade(labels, tempAHTData, humidityAHTData) {
    const ctx = document.getElementById('chartTempAHT').getContext('2d');
    if (chartTempAHT) chartTempAHT.destroy();
    
    chartTempAHT = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Temperatura AHT20 (°C)',
                data: tempAHTData,
                borderColor: '#dc3545',
                backgroundColor: 'rgba(220, 53, 69, 0.2)',
                fill: false,
                tension: 0.4,
                yAxisID: 'y'
            }, {
                label: 'Humidade AHT20 (%)',
                data: humidityAHTData,
                borderColor: '#007bff',
                backgroundColor: 'rgba(0, 123, 255, 0.2)',
                fill: false,
                tension: 0.4,
                yAxisID: 'y1'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: true },
                tooltip: { mode: 'index', intersect: false }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    title: { display: true, text: 'Temp. (°C)' }
                },
                y1: {
                    type: 'linear',
                    position: 'right',
                    title: { display: true, text: 'Humid. (%)' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

// Função para criar o gráfico de Pressão
function criarGraficoPressao(labels, pressureData) {
    const ctx = document.getElementById('pressureChart').getContext('2d');
    if (pressureChart) pressureChart.destroy();
    
    pressureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Pressão (hPa)',
                data: pressureData,
                borderColor: 'rgb(75, 192, 192)',
                backgroundColor: 'rgba(75, 192, 192, 0.2)',
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    title: { display: true, text: 'Pressão (hPa)' }
                }
            }
        }
    });
}

// Inicializar a página ao carregar
document.addEventListener('DOMContentLoaded', () => {
    fetchThingSpeak();
});