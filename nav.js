// nav.js
document.addEventListener('DOMContentLoaded', () => {
  const navHtml = `
    <nav>
      <a href="index.html">Início</a>
      <a href="avisos.html">Avisos</a>
      <a href="condicoes.html">Condições</a>
      <a href="previsao.html">Previsão</a>
      <a href="mares.html">Marés & Lua</a>
      <a href="sensores.html">Sensores</a>
      <a href="historico.html">Histórico</a>
      <a href="NASA - Imagens Espaciais.html">Nasa</a>
    </nav>
  `;
  document.body.insertAdjacentHTML('afterbegin', navHtml);
});
