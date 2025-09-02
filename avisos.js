document.addEventListener('DOMContentLoaded', () => {
    console.log('🌪️ Avisos e Monitoramento de Desastres carregado!');
    loadAlerts();
    initMap();
    loadAirQuality();
  });

  async function loadAlerts() {
    const alertsList = document.getElementById('alerts-list');
    try {
      const response = await fetch('/api/copernicus/emergency?lat=39.355&lon=-9.381');
      const data = await response.json();
      alertsList.innerHTML = data.alerts?.length
        ? data.alerts.map(a => `<div>${a.event}: ${a.description} (${a.date})</div>`).join('')
        : 'Nenhum alerta ativo.';
    } catch (e) {
      alertsList.innerHTML = 'Erro ao carregar alertas.';
      console.error('Erro CEMS:', e);
    }
  }

  function initMap() {
    const map = L.map('map').setView([39.355, -9.381], 10);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    // Adicionar camadas de imagens Sentinel via /api/copernicus/images
    fetch('/api/copernicus/images?lat=39.355&lon=-9.381&date=2025-09-01')
      .then(res => res.json())
      .then(data => {
        if (data.imageUrl) {
          L.imageOverlay(data.imageUrl, [[39.34, -9.45], [39.42, -9.30]]).addTo(map);
          document.getElementById('image-gallery').innerHTML = `<img src="${data.imageUrl}" alt="Sentinel-2" style="max-width: 100%;">`;
        }
      });
  }

  async function loadAirQuality() {
    const ctx = document.getElementById('air-quality-chart').getContext('2d');
    const response = await fetch('/api/copernicus/timeseries?lat=39.355&lon=-9.381&start=2025-09-01&end=2025-09-02&variable=pm2p5');
    const data = await response.json();
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: data.points.map(p => p.time),
        datasets: [{ label: 'PM2.5 (µg/m³)', data: data.points.map(p => p.pm2p5), borderColor: '#ff6b6b' }]
      },
      options: { responsive: true }
    });
  }