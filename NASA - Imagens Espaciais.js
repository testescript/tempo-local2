// nasa.js - Script para a página de Imagens Espaciais da NASA

// Funções para carregar as imagens
async function loadAPOD() {
    const apodCard = document.getElementById('apod-card');
    apodCard.classList.add('loading');

    try {
        const response = await fetch('http://localhost:3001/api/nasa/apod');
        if (!response.ok) throw new Error('Erro ao carregar APOD');
        const data = await response.json();
        
        document.getElementById('apod-image').src = data.url;
        document.getElementById('apod-title').textContent = data.title;
        document.getElementById('apod-description').textContent = data.explanation;
        document.getElementById('apod-date').textContent = `Data: ${data.date}`;

        apodCard.classList.remove('loading');
    } catch (error) {
        console.error("Erro ao carregar a imagem APOD:", error);
        apodCard.innerHTML = `<p class="error">Erro ao carregar a imagem do dia.</p>`;
    }
}

async function loadPortugalImage() {
    const portugalContainer = document.getElementById('portugal-container');
    const portugalCard = document.getElementById('portugal-card');
    portugalCard.classList.add('loading');
    
    try {
        const response = await fetch('http://localhost:3001/api/nasa/portugal');
        if (!response.ok) throw new Error('Erro ao carregar imagem de Portugal');
        const data = await response.json();

        portugalContainer.innerHTML = `<img src="${data.url}" alt="${data.title}">`;
        document.getElementById('portugal-title').textContent = data.title;
        document.getElementById('portugal-info').textContent = data.description;
        
        portugalCard.classList.remove('loading');
    } catch (error) {
    console.error("Erro ao carregar a imagem de Portugal:", error);
    portugalCard.innerHTML = `<p class="error">Não foi possível carregar a imagem de Portugal.</p>`;
  }
}

// Inicialização quando a página carrega
document.addEventListener('DOMContentLoaded', () => {
    loadAPOD();
    loadPortugalImage();
});