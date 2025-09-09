
console.log('🚀 NASA.js carregado');

const API_BASE = window.location.origin;

async function fetchNASAData(endpoint) {
    const response = await fetch(`${API_BASE}/api/nasa/${endpoint}`);
    if (!response.ok) throw new Error(`Erro ${response.status}`);
    return await response.json();
}

// APOD
async function loadAPOD() {
    try {
        const data = await fetchNASAData('apod');
        const img = document.getElementById('apod-image');
        const title = document.getElementById('apod-title');
        const desc = document.getElementById('apod-description');
        const date = document.getElementById('apod-date');
        
        if (img) { img.src = data.url; img.style.display = 'block'; }
        if (title) title.textContent = data.title;
        if (desc) desc.textContent = data.explanation;
        if (date) date.textContent = `📅 ${data.date}`;
        
        console.log('✅ APOD carregado');
    } catch (error) {
        console.error('❌ Erro APOD:', error);
    }
}

// Portugal
async function loadPortugal() {
    try {
        const data = await fetchNASAData('portugal');
        const container = document.getElementById('portugal-container');
        const title = document.getElementById('portugal-title');
        const info = document.getElementById('portugal-info');
        
        if (container) container.innerHTML = `<img src="${data.url}" alt="${data.title}" class="space-image">`;
        if (title) title.textContent = data.title;
        if (info) info.textContent = data.description;
        
        console.log('✅ Portugal carregado');
    } catch (error) {
        console.error('❌ Erro Portugal:', error);
    }
}

// ISS
async function loadISS() {
    try {
        const data = await fetchNASAData('iss-real');
        const card = document.getElementById('iss-card');
        
        if (card) {
            card.innerHTML = `
                <h3>🛰️ Estação Espacial Internacional</h3>
                <p><strong>Lat:</strong> ${data.latitude}°</p>
                <p><strong>Lon:</strong> ${data.longitude}°</p>
                <p><strong>Alt:</strong> ${data.altitude_km} km</p>
                <p><strong>Vel:</strong> ${data.speed_kmh.toLocaleString()} km/h</p>
            `;
        }
        
        console.log('✅ ISS carregada');
    } catch (error) {
        console.error('❌ Erro ISS:', error);
    }
}

// ==========================================
// 🇵🇹 CARREGAR PORTUGAL NO ESPAÇO
// ==========================================
async function loadPortugalSpace() {
    const card = document.getElementById('portugal-space-card');
    if (!card) {
        console.warn('⚠️ Elemento portugal-space-card não encontrado');
        return;
    }
    
    try {
        card.innerHTML = '<div class="loading-indicator">🚀 Carregando informações sobre Portugal no espaço...</div>';
        
        const data = await fetchNASAData('portugal-space');
        
        const missionsHtml = data.missions.map(mission => `
            <div class="mission-item">
                <h4>🚀 ${mission.name}</h4>
                <p>${mission.description}</p>
                <div class="mission-details">
                    <span class="mission-date">📅 ${mission.launch_date}</span>
                    <span class="mission-status">${mission.status}</span>
                </div>
            </div>
        `).join('');
        
        const satellitesHtml = data.satellites.map(sat => `
            <div class="satellite-item">
                <h4>🛰️ ${sat.name}</h4>
                <p>${sat.description}</p>
                <div class="satellite-details">
                    <span>📅 Lançamento: ${sat.launch_date}</span>
                    <span>Status: ${sat.status}</span>
                </div>
            </div>
        `).join('');
        
        const factsHtml = data.interesting_facts.map(fact => 
            `<li>⭐ ${fact}</li>`
        ).join('');
        
        card.innerHTML = `
            <h2>🇵🇹 Portugal no Espaço</h2>
            
            <div class="space-section">
                <h3>🚀 Missões Principais</h3>
                <div class="missions-grid">
                    ${missionsHtml}
                </div>
            </div>
            
            <div class="space-section">
                <h3>🛰️ Satélites Portugueses</h3>
                <div class="satellites-grid">
                    ${satellitesHtml}
                </div>
            </div>
            
            <div class="space-section">
                <h3>⭐ Factos Interessantes</h3>
                <ul class="facts-list">
                    ${factsHtml}
                </ul>
            </div>
            
            <div class="space-stats">
                <div class="stat-item">
                    <span class="stat-value">${data.statistics.space_companies}</span>
                    <span class="stat-label">Empresas Espaciais</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${data.statistics.satellites_launched}</span>
                    <span class="stat-label">Satélites Lançados</span>
                </div>
                <div class="stat-item">
                    <span class="stat-value">${data.statistics.missions_participated}</span>
                    <span class="stat-label">Missões Participadas</span>
                </div>
            </div>
        `;
        
        card.classList.add('loaded');
        console.log('✅ Portugal no Espaço carregado com sucesso');
        
    } catch (error) {
        card.innerHTML = `
            <div class="error-card">
                <h3>❌ Erro ao carregar Portugal no Espaço</h3>
                <p>${error.message}</p>
                <button onclick="loadPortugalSpace()" class="retry-btn">🔄 Tentar Novamente</button>
            </div>
        `;
        console.error('❌ Erro Portugal Space:', error);
    }
}

// ==========================================
// 🔴 CARREGAR FOTOS DE MARTE
// ==========================================
async function loadMarsPhotos() {
    const marsCard = document.getElementById('mars-card');
    if (!marsCard) {
        console.warn('⚠️ Elemento mars-card não encontrado');
        return;
    }
    
    try {
        marsCard.innerHTML = '<div class="loading-indicator">🔴 Carregando últimas fotos de Marte...</div>';
        
        const data = await fetchNASAData('mars?rover=perseverance');
        
        const photosHtml = data.photos.slice(0, 6).map(photo => `
            <div class="mars-photo">
                <img src="${photo.img_src}" alt="Marte - ${photo.camera.full_name}" 
                     class="mars-image" loading="lazy" 
                     onerror="this.src='https://via.placeholder.com/300x200?text=Imagem+Indisponível'">
                <div class="photo-info">
                    <div class="photo-details">
                        <span class="sol">Sol ${photo.sol}</span>
                        <span class="date">${photo.earth_date}</span>
                    </div>
                    <div class="camera-info">
                        <span class="camera">${photo.camera.name}</span>
                        <span class="rover">${photo.rover.name}</span>
                    </div>
                </div>
            </div>
        `).join('');
        
        marsCard.innerHTML = `
            <h2>🔴 Últimas Fotos de Marte</h2>
            <div class="mars-info">
                <span class="rover-name">Rover: ${data.rover}</span>
                <span class="photos-count">Total: ${data.total_photos} fotos</span>
                <span class="source">${data.source}</span>
            </div>
            <div class="mars-gallery">
                ${photosHtml}
            </div>
            ${data.status === 'demo' ? '<div class="demo-notice">🚧 Dados de demonstração - Configure NASA_API_KEY para fotos reais</div>' : ''}
        `;
        
        marsCard.classList.add('loaded');
        console.log('✅ Fotos de Marte carregadas com sucesso');
        
    } catch (error) {
        marsCard.innerHTML = `
            <div class="error-card">
                <h3>❌ Erro ao carregar fotos de Marte</h3>
                <p>Verifique se NASA_API_KEY está configurada</p>
                <button onclick="loadMarsPhotos()" class="retry-btn">🔄 Tentar Novamente</button>
            </div>
        `;
        console.error('❌ Erro Mars Photos:', error);
    }
}

// ==========================================
// 🔄 ATUALIZAR INICIALIZAÇÃO
// ==========================================
// Atualizar a função de inicialização existente para incluir os novos carregamentos
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌤️ Inicializando página NASA...');
    
    // Carregar dados principais
    loadAPOD();
    loadPortugal();
    
    // Carregar novos dados
    if (document.getElementById('portugal-space-card')) {
        loadPortugalSpace();
    }
    
    if (document.getElementById('mars-card')) {
        loadMarsPhotos();
    }
    
    // ISS com atualização periódica
    if (document.getElementById('iss-card')) {
        loadISS();
        setInterval(loadISS, 120000); // Atualizar a cada 2 minutos
    }
    
    console.log('✅ Inicialização da página NASA concluída');
});

// Melhorar estados de loading
function showLoading(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="loading-state">
                <div class="spinner"></div>
                <p>${message}</p>
            </div>
        `;
    }
}

function showError(elementId, error) {
    const element = document.getElementById(elementId);
    if (element) {
        element.innerHTML = `
            <div class="error-state">
                <h4>⚠️ Temporariamente Indisponível</h4>
                <p>Este serviço será restaurado em breve</p>
                <small>Erro: ${error.message}</small>
            </div>
        `;
    }
}
// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    console.log('🌤️ Inicializando NASA...');
    loadAPOD();
    loadPortugal();
    
    // Só carregar ISS se elemento existir
    if (document.getElementById('iss-card')) {
        loadISS();
    }
});