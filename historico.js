// historico.js
let historicoChart;

async function carregarHistorico() {
  const divHistorico = document.getElementById('historico');
  try {
    const url = `http://localhost:3001/api/thingspeak?results=2000`; // Aumenta resultados para mais dados
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`Erro ao carregar dados do servidor: ${response.statusText}`);
    }
    
    const data = await response.json();

    if (data.feeds && data.feeds.length > 0) {
      
      // 1. Processar e criar o gráfico de médias horárias
      const feeds24h = getFeedsForLast24Hours(data.feeds);
      const hourlyData = processHourlyData(feeds24h);
      criarGrafico(hourlyData);
      
      // 2. Inverter a ordem dos dados para a tabela
      const feedsInvertidos = [...data.feeds].reverse();
      
      // 3. Criar a tabela com os dados invertidos
      divHistorico.classList.remove('loading');
      const rows = feedsInvertidos.map(feed => {
        const date = new Date(feed.created_at);
        return `<tr><td>${date.toLocaleString()}</td><td>${feed.field1 || '--'} °C</td><td>${feed.field2 || '--'} %</td></tr>`;
      }).join('');
      
      divHistorico.innerHTML = `
        <table border='1' cellpadding='5'>
          <thead>
            <tr>
              <th>Data</th>
              <th>Temperatura</th>
              <th>Umidade</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      `;
    } else {
      divHistorico.textContent = 'Nenhum dado de histórico disponível.';
    }
  } catch (error) {
    divHistorico.textContent = `Erro ao carregar histórico: ${error.message}`;
    console.error(error);
  }
}

// Retorna os dados apenas das últimas 24 horas
function getFeedsForLast24Hours(feeds) {
  const now = new Date();
  const twentyFourHoursAgo = now.getTime() - (24 * 60 * 60 * 1000);
  return feeds.filter(feed => {
    const feedDate = new Date(feed.created_at);
    return feedDate.getTime() >= twentyFourHoursAgo;
  });
}

// Processa os dados para calcular a média por hora
function processHourlyData(feeds) {
  const hourlyAverages = {};
  
  feeds.forEach(feed => {
    const date = new Date(feed.created_at);
    const hourKey = `${date.toLocaleDateString()} ${date.getHours()}:00`;
    
    if (!hourlyAverages[hourKey]) {
      hourlyAverages[hourKey] = {
        tempSum: 0,
        humiditySum: 0,
        count: 0
      };
    }
    
    hourlyAverages[hourKey].tempSum += parseFloat(feed.field1);
    hourlyAverages[hourKey].humiditySum += parseFloat(feed.field2);
    hourlyAverages[hourKey].count++;
  });
  
  const result = Object.keys(hourlyAverages).map(key => {
    const avg = hourlyAverages[key];
    return {
      label: key,
      temp: (avg.tempSum / avg.count).toFixed(2),
      humidity: (avg.humiditySum / avg.count).toFixed(2)
    };
  });
  
  return result;
}

// Cria o gráfico com as médias horárias
function criarGrafico(data) {
  const ctx = document.getElementById('historicoChart').getContext('2d');
  if (historicoChart) historicoChart.destroy();
  
  historicoChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.label),
      datasets: [{
        label: 'Média de Temperatura (°C)',
        data: data.map(d => d.temp),
        borderColor: '#dc3545',
        tension: 0.3
      }, {
        label: 'Média de Humidade (%)',
        data: data.map(d => d.humidity),
        borderColor: '#007bff',
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        x: {
          title: {
            display: true,
            text: 'Hora'
          }
        },
        y: {
          title: {
            display: true,
            text: 'Valor'
          }
        }
      }
    }
  });
}

// Inicia o carregamento quando a página estiver pronta
document.addEventListener('DOMContentLoaded', carregarHistorico);