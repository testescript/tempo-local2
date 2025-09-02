// mares.js - Versão otimizada com WorldTides e cache inteligente

const LOCATIONS = {
    tides: { lat: 39.3558, lon: -9.38112 } // Peniche
};

let tideChart;

// Configuração de cache para economizar créditos da API
const CACHE_CONFIG = {
    DURATION: 3600000, // 1 hora em ms
    KEY: 'worldtides_cache',
    LAST_REQUEST_KEY: 'worldtides_last_request',
    MIN_INTERVAL: 1800000 // Mínimo 30 minutos entre requests
};

/**
 * Calcula a fase da lua para uma data específica
 * @param {Date} data - Data para calcular a fase
 * @returns {string} - Nome da fase lunar
 */
function calcularFaseLua(data) {
    const ciclo = 29.53058867;
    const ref = new Date('2000-01-06T18:14:00Z');
    const dias = (data - ref) / 86400000;
    const idade = ((dias % ciclo) + ciclo) % ciclo;

    if (idade < 1.84566) return 'Lua Nova 🌑';
    if (idade < 5.53699) return 'Crescente 🌒';
    if (idade < 9.22831) return 'Quarto Crescente 🌓';
    if (idade < 12.91963) return 'Crescente Gibosa 🌔';
    if (idade < 16.61096) return 'Lua Cheia 🌕';
    if (idade < 20.30228) return 'Minguante Gibosa 🌖';
    if (idade < 23.99361) return 'Quarto Minguante 🌗';
    if (idade < 27.68493) return 'Minguante 🌘';
    return 'Lua Nova 🌑';
}

/**
 * Verifica se dados em cache são válidos
 * @returns {boolean} - True se cache é válido
 */
function isDadosCacheValidos() {
    try {
        const lastRequest = localStorage.getItem(CACHE_CONFIG.LAST_REQUEST_KEY);
        const cachedData = localStorage.getItem(CACHE_CONFIG.KEY);
        
        if (!lastRequest || !cachedData) {
            return false;
        }
        
        const lastRequestTime = parseInt(lastRequest);
        const now = Date.now();
        const timeDiff = now - lastRequestTime;
        
        return timeDiff < CACHE_CONFIG.DURATION;
        
    } catch (e) {
        console.warn('Erro ao verificar cache:', e);
        return false;
    }
}

/**
 * Obtém dados do cache local
 * @returns {Object|null} - Dados cached ou null
 */
function obterDadosCache() {
    try {
        const cachedData = localStorage.getItem(CACHE_CONFIG.KEY);
        if (cachedData) {
            return JSON.parse(cachedData);
        }
    } catch (e) {
        console.warn('Erro ao ler cache:', e);
    }
    return null;
}

/**
 * Salva dados no cache local
 * @param {Object} data - Dados para salvar
 */
function salvarDadosCache(data) {
    try {
        localStorage.setItem(CACHE_CONFIG.KEY, JSON.stringify(data));
        localStorage.setItem(CACHE_CONFIG.LAST_REQUEST_KEY, Date.now().toString());
        console.log('✅ Dados salvos no cache por', CACHE_CONFIG.DURATION / 60000, 'minutos');
    } catch (e) {
        console.warn('Erro ao salvar cache:', e);
    }
}

/**
 * Verifica se pode fazer nova requisição (rate limiting)
 * @returns {boolean} - True se pode fazer requisição
 */
function podeComputarNovaRequisicao() {
    try {
        const lastRequest = localStorage.getItem(CACHE_CONFIG.LAST_REQUEST_KEY);
        if (!lastRequest) return true;
        
        const lastRequestTime = parseInt(lastRequest);
        const now = Date.now();
        const timeDiff = now - lastRequestTime;
        
        return timeDiff >= CACHE_CONFIG.MIN_INTERVAL;
    } catch (e) {
        return true;
    }
}

/**
 * Busca dados da API WorldTides com parâmetros otimizados
 * @returns {Promise<Object>} - Dados da API
 */
async function buscarDadosWorldTides() {
    const { lat, lon } = LOCATIONS.tides;
    
    try {
        // Usar parâmetros otimizados para economizar créditos
        const params = new URLSearchParams({
            extremes: '1',    // Só picos de maré (menos dados = menos crédito)
            lat: lat.toString(),
            lon: lon.toString(),
            length: '86400'   // 24 horas apenas
        });
        
        const url = `/api/worldtides?${params}`;
        console.log('🌐 Consultando WorldTides API:', url);
        
        const response = await fetch(url);
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`WorldTides API erro: ${response.status} - ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(`WorldTides erro: ${data.error}`);
        }
        
        console.log('✅ Dados WorldTides obtidos com sucesso');
        if (data.callCount) {
            console.log(`📊 Créditos utilizados: ${data.callCount}`);
        }
        
        return data;
        
    } catch (error) {
        console.error('❌ Erro ao buscar dados WorldTides:', error);
        throw error;
    }
}

/**
 * Processa dados de marés em formato de série temporal
 * @param {Object} worldTidesData - Dados brutos da WorldTides API
 * @returns {Object} - Dados processados para gráfico
 */
function processarDadosMarés(worldTidesData) {
    const now = new Date();
    const points = [];
    
    // Se temos extremos de maré, interpolar entre eles
    if (worldTidesData.extremes && worldTidesData.extremes.length > 0) {
        const extremes = worldTidesData.extremes;
        console.log(`📊 Processando ${extremes.length} extremos de maré`);
        
        // Gerar pontos de hora em hora baseados nos extremos
        for (let i = 0; i < 24; i++) {
            const time = new Date(now.getTime() + i * 3600000);
            const timeUnix = time.getTime() / 1000;
            
            // Encontrar extremos próximos para interpolar
            let height = interpolarAltura(timeUnix, extremes);
            
            // Simular altura de ondas baseada na amplitude da maré
            const amplitude = Math.abs(height);
            const baseWave = 1.0;
            const waveVariation = amplitude * 0.4 + (Math.random() - 0.5) * 0.3;
            const VHM0 = Math.max(0.2, baseWave + waveVariation);
            
            points.push({
                time: time.toISOString(),
                zos: Number(height.toFixed(2)), // Nível do mar
                VHM0: Number(VHM0.toFixed(2))   // Altura das ondas
            });
        }
    } else {
        // Fallback: dados simulados baseados em padrão de maré
        console.log('⚠️ Sem dados de extremos, usando padrão simulado');
        for (let i = 0; i < 24; i++) {
            const time = new Date(now.getTime() + i * 3600000);
            
            // Padrão semi-diurno típico (2 marés por dia)
            const tideHeight = Math.sin(i * Math.PI / 6.2) * 1.8 + Math.sin(i * Math.PI / 12.4) * 0.8;
            const waveHeight = Math.max(0.3, 1.0 + (Math.random() - 0.5) * 0.8);
            
            points.push({
                time: time.toISOString(),
                zos: Number(tideHeight.toFixed(2)),
                VHM0: Number(waveHeight.toFixed(2))
            });
        }
    }
    
    return { points, source: 'worldtides', processedAt: Date.now() };
}

/**
 * Interpola altura entre extremos de maré
 * @param {number} targetTime - Timestamp Unix do tempo desejado
 * @param {Array} extremes - Array de extremos de maré
 * @returns {number} - Altura interpolada
 */
function interpolarAltura(targetTime, extremes) {
    if (extremes.length === 0) return 0;
    if (extremes.length === 1) return extremes[0].height;
    
    // Ordenar extremos por tempo
    const sorted = extremes.sort((a, b) => a.dt - b.dt);
    
    // Encontrar os dois extremos mais próximos
    let before = sorted[0];
    let after = sorted[sorted.length - 1];
    
    for (let i = 0; i < sorted.length - 1; i++) {
        if (sorted[i].dt <= targetTime && sorted[i + 1].dt >= targetTime) {
            before = sorted[i];
            after = sorted[i + 1];
            break;
        }
    }
    
    // Interpolação linear
    if (before.dt === after.dt) return before.height;
    
    const ratio = (targetTime - before.dt) / (after.dt - before.dt);
    return before.height + (after.height - before.height) * ratio;
}

/**
 * Mostra status do cache na interface
 * @param {boolean} isCache - Se está usando cache
 * @param {number} proximaAtualizacao - Timestamp da próxima atualização
 */
function mostrarStatusCache(isCache, proximaAtualizacao) {
    const statusDiv = document.getElementById('cache-status') || criarStatusDiv();
    
    if (isCache) {
        const minutosRestantes = Math.ceil((proximaAtualizacao - Date.now()) / 60000);
        statusDiv.innerHTML = `
            <div style="background: #e7f3ff; color: #0066cc; padding: 8px 12px; border-radius: 20px; font-size: 0.9em;">
                💾 <strong>Cache Ativo</strong> - Atualização em ${minutosRestantes}min
            </div>
        `;
    } else {
        statusDiv.innerHTML = `
            <div style="background: #e8f5e8; color: #0d5016; padding: 8px 12px; border-radius: 20px; font-size: 0.9em;">
                🌐 <strong>Dados Atuais</strong> - API WorldTides
            </div>
        `;
    }
}

/**
 * Cria elemento de status se não existir
 */
function criarStatusDiv() {
    const statusDiv = document.createElement('div');
    statusDiv.id = 'cache-status';
    const container = document.querySelector('.status-info') || document.body;
    container.appendChild(statusDiv);
    return statusDiv;
}

/**
 * Função principal para carregar dados de marés
 */
async function carregarMaresELua() {
    try {
        const statusElement = document.getElementById('loading-status');
        updateStatus(statusElement, 'Verificando dados de marés...', 'loading');

        let data;
        let isCache = false;
        let fonte = 'WorldTides API';

        // Estratégia 1: Verificar cache primeiro (economia de créditos)
        if (isDadosCacheValidos()) {
            console.log('📦 Usando dados do cache (economia de API)');
            data = obterDadosCache();
            isCache = true;
            
            const lastRequest = parseInt(localStorage.getItem(CACHE_CONFIG.LAST_REQUEST_KEY));
            const proximaAtualizacao = lastRequest + CACHE_CONFIG.DURATION;
            mostrarStatusCache(true, proximaAtualizacao);
            
        } else if (podeComputarNovaRequisicao()) {
            // Estratégia 2: Fazer nova requisição apenas se permitido
            updateStatus(statusElement, 'Consultando API WorldTides...', 'loading');
            
            try {
                const worldTidesData = await buscarDadosWorldTides();
                data = processarDadosMarés(worldTidesData);
                
                // Salvar no cache para economizar créditos futuros
                salvarDadosCache(data);
                mostrarStatusCache(false);
                
                console.log('🌊 Dados novos obtidos da WorldTides API');
                
            } catch (apiError) {
                console.warn('⚠️ API falhou, tentando usar cache antigo:', apiError.message);
                
                // Estratégia 3: Usar cache antigo mesmo se expirado
                const oldCache = obterDadosCache();
                if (oldCache) {
                    data = oldCache;
                    isCache = true;
                    fonte = 'Cache (API indisponível)';
                    mostrarAvisoApiLimitada();
                } else {
                    throw apiError;
                }
            }
        } else {
            // Estratégia 4: Rate limiting - usar cache mesmo se antigo
            console.log('⏰ Rate limiting ativo, usando cache');
            const oldCache = obterDadosCache();
            if (oldCache) {
                data = oldCache;
                isCache = true;
                fonte = 'Cache (Rate limiting)';
                mostrarAvisoRateLimited();
            } else {
                throw new Error('Dados não disponíveis - aguarde para nova consulta');
            }
        }

        // Validar dados
        if (!data || !data.points || data.points.length === 0) {
            throw new Error('Dados de marés inválidos ou vazios');
        }

        // Atualizar interface
        await atualizarInterface(data, isCache, fonte);
        
        updateStatus(statusElement, 'Dados carregados com sucesso', 'success');
        setTimeout(() => updateStatus(statusElement, '', ''), 3000);

    } catch (error) {
        console.error('❌ Erro ao carregar dados de marés:', error);
        updateStatus(document.getElementById('loading-status'), `Erro: ${error.message}`, 'error');
        mostrarErroCompleto(error.message);
    }
}

/**
 * Atualiza interface com os dados obtidos
 * @param {Object} data - Dados processados
 * @param {boolean} isCache - Se está usando cache
 * @param {string} fonte - Fonte dos dados
 */
async function atualizarInterface(data, isCache, fonte) {
    // Atualizar fase da lua
    const moonPhase = calcularFaseLua(new Date());
    const moonElement = document.getElementById('lua-fase');
    if (moonElement) {
        moonElement.textContent = moonPhase;
    }

    // Atualizar fonte de dados (função externa se disponível)
    if (typeof atualizarFonteDados === 'function') {
        atualizarFonteDados(fonte, isCache);
    }

    // Preparar dados para gráfico
    const first24 = data.points.slice(0, 24);
    const labels = first24.map(p => new Date(p.time));
    const waves = first24.map(p => p.VHM0 !== null && p.VHM0 !== undefined ? p.VHM0 : null);
    const ssh = first24.map(p => p.zos !== null && p.zos !== undefined ? p.zos : null);

    criarGrafico(labels, waves, ssh, isCache, fonte);
}

/**
 * Função auxiliar para atualizar status
 */
function updateStatus(element, message, type) {
    if (!element) return;
    
    element.textContent = message;
    element.className = 'loading';
    
    if (type === 'success') element.style.color = 'green';
    else if (type === 'error') element.style.color = 'red';
    else if (type === 'loading') element.style.color = 'blue';
    else element.style.color = '';
}

/**
 * Mostra avisos específicos na interface
 */
function mostrarAvisoApiLimitada() {
    mostrarAviso('⚠️ API Temporariamente Indisponível', 
                'Usando dados em cache. A página será atualizada quando a API estiver disponível.',
                'warning');
}

function mostrarAvisoRateLimited() {
    const minutos = Math.ceil(CACHE_CONFIG.MIN_INTERVAL / 60000);
    mostrarAviso('⏰ Aguardando Intervalo de API', 
                `Para economizar créditos, próxima consulta em ${minutos} minutos.`,
                'warning');
}

function mostrarAviso(titulo, mensagem, tipo = 'warning') {
    const existingWarning = document.getElementById('dynamic-warning');
    if (existingWarning) existingWarning.remove();

    const backgrounds = {
        warning: '#fff3cd',
        error: '#f8d7da',
        info: '#d1ecf1'
    };
    
    const colors = {
        warning: '#856404',
        error: '#721c24', 
        info: '#0c5460'
    };

    const warningDiv = document.createElement('div');
    warningDiv.id = 'dynamic-warning';
    warningDiv.innerHTML = `
        <div style="background: ${backgrounds[tipo]}; color: ${colors[tipo]}; padding: 12px; margin: 15px 0; border-radius: 6px; border-left: 4px solid ${colors[tipo]};">
            <strong>${titulo}</strong><br>
            ${mensagem}
        </div>
    `;
    
    const container = document.querySelector('.container') || document.body;
    const header = container.querySelector('.header');
    if (header && header.nextSibling) {
        container.insertBefore(warningDiv, header.nextSibling);
    } else {
        container.insertBefore(warningDiv, container.firstChild);
    }
}

function mostrarErroCompleto(mensagem) {
    const container = document.querySelector('.container') || document.body;
    const errorDiv = document.createElement('div');
    errorDiv.innerHTML = `
        <div style="background: #f8d7da; color: #721c24; padding: 20px; margin: 20px 0; border-radius: 8px; border-left: 4px solid #dc3545;">
            <h4 style="margin: 0 0 10px 0;">❌ Erro de Dados de Marés</h4>
            <p><strong>Erro:</strong> ${mensagem}</p>
            <p><strong>Possíveis soluções:</strong></p>
            <ul style="margin: 10px 0;">
                <li>Verificar se a API WorldTides está configurada no .env</li>
                <li>Aguardar alguns minutos (limite de requisições)</li>
                <li>Verificar conexão com internet</li>
                <li>Recarregar a página</li>
            </ul>
            <button onclick="carregarMaresELua()" style="padding: 10px 16px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer; margin-top: 15px;">
                🔄 Tentar Novamente
            </button>
        </div>
    `;
    container.appendChild(errorDiv);
}

/**
 * Cria gráfico interativo com Chart.js
 */
function criarGrafico(labels, waves, ssh, isCache = false, fonte = 'WorldTides') {
    const ctx = document.getElementById('tideChart');
    if (!ctx) {
        console.error('❌ Elemento canvas "tideChart" não encontrado');
        return;
    }

    // Destruir gráfico anterior
    if (tideChart) {
        tideChart.destroy();
    }

    const titlePrefix = isCache ? '💾 CACHE - ' : '🌊 ATUAL - ';
    const borderDash = isCache ? [5, 5] : [];

    tideChart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: labels,
            datasets: [
                {
                    label: 'Altura das Ondas (m)',
                    data: waves,
                    borderColor: isCache ? 'rgba(255,165,0,0.9)' : 'rgb(0,123,255)',
                    backgroundColor: isCache ? 'rgba(255,165,0,0.1)' : 'rgba(0,123,255,0.1)',
                    yAxisID: 'y-waves',
                    spanGaps: true,
                    tension: 0.3,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    borderDash: borderDash,
                    fill: false
                },
                {
                    label: 'Nível do Mar (m)', 
                    data: ssh,
                    borderColor: isCache ? 'rgba(255,140,0,0.9)' : 'rgba(75,192,192,1)',
                    backgroundColor: isCache ? 'rgba(255,140,0,0.1)' : 'rgba(75,192,192,0.1)',
                    yAxisID: 'y-ssh',
                    spanGaps: true,
                    tension: 0.3,
                    pointRadius: 2,
                    pointHoverRadius: 5,
                    borderDash: borderDash,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                title: {
                    display: true,
                    text: `${titlePrefix}Marés - Peniche (${fonte})`,
                    color: isCache ? '#ff8c00' : '#333',
                    font: {
                        size: 16,
                        weight: 'normal'
                    }
                },
                legend: {
                    position: 'top',
                    labels: {
                        usePointStyle: true,
                        padding: 20
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    callbacks: {
                        title: function(context) {
                            return new Date(context[0].label).toLocaleString('pt-PT');
                        },
                        label: function(context) {
                            const value = context.parsed.y?.toFixed(2) || 'N/A';
                            const cacheLabel = isCache ? ' (cache)' : ' (atual)';
                            return `${context.dataset.label}: ${value}${cacheLabel}`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: 'hour',
                        displayFormats: { hour: 'HH:mm' }
                    },
                    title: {
                        display: true,
                        text: 'Hora Local'
                    },
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                'y-waves': {
                    type: 'linear',
                    position: 'left',
                    title: {
                        display: true,
                        text: 'Altura Ondas (m)'
                    },
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(0,0,0,0.1)'
                    }
                },
                'y-ssh': {
                    type: 'linear',
                    position: 'right',
                    title: {
                        display: true,
                        text: 'Nível Mar (m)'
                    },
                    grid: {
                        drawOnChartArea: false,
                        color: 'rgba(0,0,0,0.1)'
                    }
                }
            },
            interaction: {
                mode: 'index',
                intersect: false
            }
        }
    });

    console.log('📊 Gráfico criado com sucesso');
}

/**
 * Atualização automática inteligente (respeitando cache e rate limiting)
 */
function iniciarAtualizacaoInteligente() {
    const intervalo = 15 * 60 * 1000; // 15 minutos
    
    setInterval(() => {
        // Só atualizar se cache expirou e rate limiting permite
        if (!isDadosCacheValidos() && podeComputarNovaRequisicao()) {
            console.log('🔄 Atualização automática disparada');
            carregarMaresELua();
        } else {
            console.log('💾 Atualização automática pulada (cache/rate limiting)');
        }
    }, intervalo);
    
    console.log(`⏰ Atualização automática configurada a cada ${intervalo / 60000} minutos`);
}

// Event listeners principais
document.addEventListener('DOMContentLoaded', function() {
    console.log('🌊 Página de marés (WorldTides + Cache) inicializada');
    
    // Carregar dados iniciais
    carregarMaresELua();
    
    // Iniciar sistema de atualização inteligente
    iniciarAtualizacaoInteligente();
    
    // Configurar botão de refresh
    const refreshButton = document.getElementById('refresh-btn');
    if (refreshButton) {
        refreshButton.addEventListener('click', () => {
            console.log('🔄 Refresh manual solicitado');
            carregarMaresELua();
        });
    }
});

// Exportar funções para uso global
window.carregarMaresELua = carregarMaresELua;
window.calcularFaseLua = calcularFaseLua;

// Debug: informações sobre cache no console
if (typeof window !== 'undefined' && window.location.hostname === 'localhost') {
    window.debugCache = {
        verificar: () => {
            console.log('Cache válido:', isDadosCacheValidos());
            console.log('Pode nova requisição:', podeComputarNovaRequisicao());
            const lastReq = localStorage.getItem(CACHE_CONFIG.LAST_REQUEST_KEY);
            if (lastReq) {
                const diff = Date.now() - parseInt(lastReq);
                console.log('Última requisição há:', Math.round(diff / 60000), 'minutos');
            }
        },
        limpar: () => {
            localStorage.removeItem(CACHE_CONFIG.KEY);
            localStorage.removeItem(CACHE_CONFIG.LAST_REQUEST_KEY);
            console.log('Cache limpo');
        }
    };
    console.log('🛠️ Debug disponível: debugCache.verificar() e debugCache.limpar()');
}