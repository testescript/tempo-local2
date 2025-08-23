// mares.js
let tideChart;

async function carregarMaresELua() {
    const MARES_URL = 'http://localhost:3001/api/tides';
    try {
        const response = await fetch(MARES_URL);
        if (!response.ok) {
            throw new Error(`Erro de rede: ${response.statusText}`);
        }
        const data = await response.json();
        
        if (!data || !data.hours) {
            throw new Error('Dados de marés e lua não disponíveis.');
        }
        
        const moonPhase = data.hours[0]?.moonPhase.sg;
        document.getElementById('lua-fase').textContent = `Fase da Lua: ${moonPhase}`;

        const labels = data.hours.slice(0, 24).map(hour => {
            const date = new Date(hour.time);
            return `${date.getHours()}:00`;
        });
        const tideData = data.hours.slice(0, 24).map(hour => hour.tide.sg);
        const swellData = data.hours.slice(0, 24).map(hour => hour.swellHeight.sg);

        criarGraficoMares(labels, tideData, swellData);

    } catch (error) {
        console.error('Erro ao carregar dados de marés e lua:', error);
        document.querySelector('main').innerHTML = `<h1>Erro ao carregar dados de marés e lua</h1><p>${error.message}</p>`;
    }
}

function criarGraficoMares(labels, tideData, swellData) {
    const ctx = document.getElementById('tideChart').getContext('2d');
    if (tideChart) tideChart.destroy();
    
    tideChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Altura das Ondas (m)',
                data: swellData,
                borderColor: 'rgb(0, 123, 255)',
                yAxisID: 'y-swell'
            }, {
                label: 'Altura da Maré (m)',
                data: tideData,
                borderColor: 'rgba(75, 192, 192, 1)',
                yAxisID: 'y-tide'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                'y-swell': {
                    position: 'left',
                    title: { display: true, text: 'Altura das Ondas (m)' }
                },
                'y-tide': {
                    position: 'right',
                    title: { display: true, text: 'Altura da Maré (m)' },
                    grid: { drawOnChartArea: false }
                }
            }
        }
    });
}

document.addEventListener('DOMContentLoaded', carregarMaresELua);