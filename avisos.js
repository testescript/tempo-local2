// avisos.js
async function carregarAvisos() {
  const avisosDiv = document.getElementById("avisos");
  try {
    const url = `http://localhost:3001/api/weather/alerts?lat=${LOCATIONS.weather.lat}&lon=${LOCATIONS.weather.lon}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erro ao carregar dados do servidor');
    const data = await response.json();
    if (data.alerts && data.alerts.length > 0) {
      avisosDiv.classList.remove('loading');
      avisosDiv.innerHTML = '<ul>' + data.alerts.map(alert =>
        `<li><strong>${alert.event}</strong>: ${alert.description}</li>`).join('') + '</ul>';
    } else {
      avisosDiv.textContent = "Nenhum aviso meteorológico no momento.";
    }
  } catch (error) {
    avisosDiv.textContent = "Erro ao carregar os avisos meteorológicos.";
    console.error(error);
  }
}
carregarAvisos();
