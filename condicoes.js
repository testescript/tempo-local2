// condicoes.js
async function carregarCondicoes() {
  const ul = document.getElementById("condicoes");
  try {
    const url = `http://localhost:3001/api/weather/current?lat=${LOCATIONS.weather.lat}&lon=${LOCATIONS.weather.lon}`;
    const response = await fetch(url);
    if (!response.ok) throw new Error('Erro ao carregar dados do servidor');
    const data = await response.json();
    ul.classList.remove('loading');
    ul.innerHTML = `
      <li>Temperatura: ${data.main.temp} °C</li>
      <li>Vento: ${data.wind.speed} m/s, ${data.wind.deg}°</li>
      <li>Pressão: ${data.main.pressure} hPa</li>
      <li>Umidade: ${data.main.humidity} %</li>
      <li>Descrição: ${data.weather[0].description}</li>
    `;
  } catch (error) {
    ul.textContent = "Erro ao carregar as condições atuais.";
    console.error(error);
  }
}
carregarCondicoes();