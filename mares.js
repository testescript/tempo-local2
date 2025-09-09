class RealDataOceanDashboard {
    constructor() {
        this.charts = {};
        this.currentTheme = 'light';
        this.currentSource = 'hybrid';  // hybrid, worldtides, stormglass, cmems
        this.realData = null;
        this.init();
    }

    // ===============================
    // INICIALIZAÇÃO
    // ===============================
    async init() {
    console.log('🌊 Dashboard: Dados reais com seleção de fonte');
    await this.waitForDOM();
    this.debugElements(); // ← ADICIONAR ESTA LINHA
    this.setupEventListeners();
    this.initCharts();
    await this.loadData();
    this.startAutoUpdate();
}

    async waitForDOM() {
        return new Promise(resolve => {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', resolve);
            } else {
                resolve();
            }
        });
    }

    // ===============================
    // EVENT LISTENERS
    // ===============================
    setupEventListeners() {
        console.log('🎯 Configurando event listeners');
        
        // Seleção de fonte de dados
        document.querySelectorAll('input[name="data-source"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.currentSource = e.target.value;
                console.log(`🔄 Fonte alterada para: ${this.currentSource}`);
                this.loadData();
            });
        });

        // Botão refresh normal
        const refreshBtn = document.getElementById('refresh-btn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => {
                console.log('🔄 Refresh manual');
                this.loadData();
            });
        }

        // Botão forçar refresh (ignorar cache)
        const forceRefreshBtn = document.getElementById('force-refresh');
        if (forceRefreshBtn) {
            forceRefreshBtn.addEventListener('click', () => {
                console.log('🔄 Refresh forçado (ignorar cache)');
                this.loadData(true);
            });
        }
    }

    // ===============================
    // CARREGAMENTO DE DADOS
    // ===============================
    async loadData(forceRefresh = false) {
    try {
        console.log(`🔄 Carregando dados - Fonte: ${this.currentSource}`);
        
        let url = `/api/ocean/combined?source=${this.currentSource}`;
       if (forceRefresh) url += '&force_refresh=true';
        
        console.log('📡 Fazendo fetch para:', url);
        const response = await fetch(url);
        const data = await response.json();
        
        console.log('✅ Dados recebidos completos:', data);
        console.log('🔍 Estrutura dos dados:', {
            sources: data.sources ? Object.keys(data.sources) : 'undefined',
            current: data.data?.current ? Object.keys(data.data.current) : 'undefined',
            forecast: data.data?.forecast ? data.data.forecast.length + ' items' : 'undefined',
            cache_info: data.cache_info ? Object.keys(data.cache_info) : 'undefined'
        });
        
        this.realData = data;
        
        // Atualizar interface com logs detalhados
        console.log('🔄 Iniciando atualizações da UI...');
        
        if (data.data?.current) {
            console.log('🔄 Atualizando KPIs...');
            this.updateKPIs(data.data.current);
        }
        
        if (data.sources) {
            console.log('🔄 Atualizando fontes...');
            this.updateSources(data.sources, data.source_selected);
        }
        
        if (data.data?.forecast) {
            console.log('🔄 Atualizando gráficos...');
            this.updateCharts(data.data.forecast);
        }
        
        if (data.data) {
            console.log('🔄 Atualizando detalhes...');
            this.updateDetails(data.data);
        }
        
        console.log('🔄 Atualizando cache info...');
        this.updateCacheInfo(data.cache_info);
        
        console.log('🔄 Atualizando última atualização...');
        this.updateLastUpdate();
        
        console.log('✅ Todas as atualizações da UI concluídas');
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        this.showError();
    }
}
    // ===============================
    // ATUALIZAÇÃO DE KPIS
    // ===============================
    updateKPIs(current) {
        if (!current) {
            console.warn('⚠️ Dados atuais não disponíveis');
            return;
        }

        // Altura das ondas
        this.updateKPI('wave-height', current.wave_height, 'm', 'wave-source', 
            current.wave_height ? 'Disponível' : 'N/A');
        
        // Temperatura da água
        this.updateKPI('water-temp', current.water_temperature, '°C', 'temp-source',
            current.water_temperature ? 'Disponível' : 'N/A');
            
        // Nível do mar / maré
        this.updateKPI('tide-level', current.tide_level, 'm', 'tide-source',
            current.tide_level ? 'Disponível' : 'N/A');
            
        // Velocidade do vento
        this.updateKPI('wind-speed', current.wind_speed, 'm/s', 'wind-source',
            current.wind_speed ? 'Disponível' : 'N/A');
    }

    updateKPI(elementId, value, unit, sourceId, sourceName) {
        const element = document.getElementById(elementId);
        const sourceElement = document.getElementById(sourceId);
        
        if (element) {
            if (value !== undefined && value !== null) {
                element.textContent = parseFloat(value).toFixed(1);
                element.style.opacity = '1';
                element.style.color = '#2563eb'; // Azul para dados disponíveis
            } else {
                element.textContent = 'N/A';
                element.style.opacity = '0.5';
                element.style.color = '#6b7280'; // Cinza para indisponível
            }
        }
        
        if (sourceElement) {
            sourceElement.textContent = sourceName || 'N/A';
        }
    }

    // ===============================
    // STATUS DAS FONTES
    // ===============================
    updateSources(sources, selectedSource) {
        const container = document.getElementById('sources-status');
        if (!container) return;
        
        container.innerHTML = '';
        
        const sourceInfo = {
            worldtides: { name: 'WorldTides', icon: '🌊', desc: 'Marés de Peniche' },
            stormglass: { name: 'Stormglass', icon: '⛈️', desc: 'Dados Marinhos' }, 
            cmems: { name: 'CMEMS', icon: '🇪🇺', desc: 'Dados Científicos' },
            openmeteo: { name: 'Open-Meteo', icon: '🌤️', desc: 'Dados Meteorológicos' }
        };

        Object.entries(sourceInfo).forEach(([key, info]) => {
            const source = sources[key] || { status: 'not_used' };
            const statusColor = source.status === 'active' ? 'green' : 
                               source.status === 'limited' ? 'yellow' : 'red';
            
            const isSelected = selectedSource === key || 
                              (selectedSource === 'hybrid' && source.status === 'active');
            
            const borderClass = isSelected ? 'border-2 border-blue-500' : 'border';
            
            const dataDate = source.original_data_date ? 
                new Date(source.original_data_date).toLocaleString('pt-PT') : 
                source.data_timestamp ? 
                new Date(source.data_timestamp).toLocaleString('pt-PT') : 'N/A';
            
            container.innerHTML += `
                <div class="bg-white rounded-xl p-4 ${borderClass}">
                    <div class="flex items-center justify-between mb-2">
                        <div>
                            <div class="font-bold">${info.icon} ${info.name}</div>
                            <div class="text-sm text-gray-600">${info.desc}</div>
                        </div>
                        <div class="w-3 h-3 bg-${statusColor}-500 rounded-full"></div>
                    </div>
                    <div class="text-xs text-gray-500">
                        Dados: ${dataDate}
                    </div>
                    ${source.error ? `<div class="text-xs text-red-500 mt-1">${source.error}</div>` : ''}
                </div>
            `;
        });
    }
    debugElements() {
    console.log('🔍 Verificando elementos HTML:');
    
    const elements = [
        'cache-status', 'cache-age', 'cache-expires',
        'wave-height', 'water-temp', 'tide-level', 'wind-speed',
        'wave-source', 'temp-source', 'tide-source', 'wind-source',
        'sources-status', 'waves-chart', 'tides-chart',
        'next-tide', 'wave-direction', 'pressure', 'data-quality'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`- ${id}:`, element ? '✅ Encontrado' : '❌ NÃO ENCONTRADO');
    });
    
    const radios = document.querySelectorAll('input[name="data-source"]');
    console.log(`- Radio buttons: ${radios.length} encontrados`);
}

updateCacheInfo(cacheInfo) {
    console.log('🔍 updateCacheInfo chamada com:', cacheInfo);
    
    if (!cacheInfo) {
        console.warn('⚠️ cacheInfo é null/undefined');
        return;
    }
    
    const cacheStatusElement = document.getElementById('cache-status');
    if (cacheStatusElement) {
        const statusText = cacheInfo.served_from_cache ? '✅ Cache HIT' : '🔄 Dados Novos';
        cacheStatusElement.textContent = statusText;
        console.log('✅ Cache status atualizado:', statusText);
    }
    
    const cacheAgeElement = document.getElementById('cache-age');
    if (cacheAgeElement) {
        const ageText = cacheInfo.cache_age_minutes !== undefined ? 
            `${cacheInfo.cache_age_minutes} min` : 'N/A';
        cacheAgeElement.textContent = ageText;
        console.log('✅ Cache age atualizado:', ageText);
    }
    
    const cacheExpiresElement = document.getElementById('cache-expires');
    if (cacheExpiresElement) {
        let expiresText;
        if (cacheInfo.expires_in_minutes !== undefined) {
            expiresText = `${cacheInfo.expires_in_minutes} min`;
        } else if (cacheInfo.cache_duration_minutes !== undefined) {
            expiresText = `${cacheInfo.cache_duration_minutes} min`;
        } else {
            expiresText = 'N/A';
        }
        cacheExpiresElement.textContent = expiresText;
        console.log('✅ Cache expires atualizado:', expiresText);
    }
}

updateDetails(data) {
    console.log('🔍 updateDetails chamada com:', data);
    
    if (!data || !data.current) return;

    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || 'N/A';
            console.log(`✅ ${id} atualizado:`, value);
        }
    };

    updateElement('next-tide', 
        data.current.next_tide ? 
        `${data.current.next_tide.type} ${data.current.next_tide.height?.toFixed(2)}m` : 'N/A');
        
    updateElement('wave-direction', 
        data.current.wave_direction ? `${data.current.wave_direction}°` : 'N/A');
        
    updateElement('pressure', 
        data.current.pressure ? `${Math.round(data.current.pressure)} hPa` : 'N/A');
        
    updateElement('data-quality', 
        `${data.metadata?.quality_score || 0}% (${data.metadata?.source_mode?.toUpperCase() || 'HYBRID'})`);
}

updateCharts(forecast) {
    console.log('🔍 updateCharts chamada com:', forecast);
    
    if (!forecast || forecast.length === 0) {
        console.log('⚠️ Sem dados de previsão para gráficos');
        return;
    }
    
    const labels = forecast.map(f => 
        new Date(f.time).toLocaleTimeString('pt-PT', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })
    );
    
    const waveData = forecast.map(f => f.wave_height || null);
    const tideData = forecast.map(f => f.sea_level || f.tide_level || null);
    
    if (this.charts.waves) {
        this.charts.waves.data.labels = labels;
        this.charts.waves.data.datasets[0].data = waveData;
        this.charts.waves.update('none');
        console.log('✅ Gráfico de ondas atualizado');
    }
    
    if (this.charts.tides) {
        this.charts.tides.data.labels = labels;
        this.charts.tides.data.datasets[0].data = tideData;
        this.charts.tides.update('none');
        console.log('✅ Gráfico de marés atualizado');
    }
}

initCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'white',
                bodyColor: 'white'
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(100, 116, 139, 0.2)' },
                ticks: { color: 'rgba(100, 116, 139, 0.8)' }
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(100, 116, 139, 0.2)' },
                ticks: { color: 'rgba(100, 116, 139, 0.8)' }
            }
        }
    };

    const wavesCanvas = document.getElementById('waves-chart');
    if (wavesCanvas) {
        const wavesCtx = wavesCanvas.getContext('2d');
        this.charts.waves = new Chart(wavesCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: chartOptions
        });
        console.log('✅ Gráfico de ondas criado');
    }

    const tidesCanvas = document.getElementById('tides-chart');
    if (tidesCanvas) {
        const tidesCtx = tidesCanvas.getContext('2d');
        this.charts.tides = new Chart(tidesCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: chartOptions
        });
        console.log('✅ Gráfico de marés criado');
    }
}

updateLastUpdate() {
    const element = document.getElementById('last-update');
    if (element) {
        const timeString = new Date().toLocaleTimeString('pt-PT');
        element.textContent = timeString;
        console.log('✅ Última atualização:', timeString);
    }
}

showError() {
    console.error('💥 Mostrando interface de erro');
    
    const updateErrorElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            element.style.opacity = '0.5';
            element.style.color = '#ef4444';
        }
    };

    updateErrorElement('data-quality', 'Sistema Offline');
    updateErrorElement('wave-height', 'ERRO');
    updateErrorElement('water-temp', 'ERRO');
    updateErrorElement('tide-level', 'ERRO');
    updateErrorElement('wind-speed', 'ERRO');
    
    const cacheStatusElement = document.getElementById('cache-status');
    if (cacheStatusElement) {
        cacheStatusElement.textContent = 'ERRO';
        cacheStatusElement.style.opacity = '0.5';
        cacheStatusElement.style.color = '#ef4444';
    }
}

startAutoUpdate() {
    console.log('⏰ Auto-atualização iniciada (5 minutos)');
    setInterval(() => {
        console.log('🔄 Auto-atualização executada');
        this.loadData();
    }, 5 * 60 * 1000);
}
    //FUNÇÕES FALTANDO
// ===============================
debugElements() {
    console.log('🔍 Verificando elementos HTML:');
    
    const elements = [
        'cache-status', 'cache-age', 'cache-expires',
        'wave-height', 'water-temp', 'tide-level', 'wind-speed',
        'wave-source', 'temp-source', 'tide-source', 'wind-source',
        'sources-status', 'waves-chart', 'tides-chart',
        'next-tide', 'wave-direction', 'pressure', 'data-quality'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`- ${id}:`, element ? '✅ Encontrado' : '❌ NÃO ENCONTRADO');
    });
}

updateCacheInfo(cacheInfo) {
    console.log('🔍 updateCacheInfo chamada com:', cacheInfo);
    
    if (!cacheInfo) {
        console.warn('⚠️ cacheInfo é null/undefined');
        return;
    }
    
    const cacheStatusElement = document.getElementById('cache-status');
    if (cacheStatusElement) {
        const statusText = cacheInfo.served_from_cache ? '✅ Cache HIT' : '🔄 Dados Novos';
        cacheStatusElement.textContent = statusText;
        console.log('✅ Cache status atualizado:', statusText);
    }
    
    const cacheAgeElement = document.getElementById('cache-age');
    if (cacheAgeElement) {
        const ageText = cacheInfo.cache_age_minutes !== undefined ? 
            `${cacheInfo.cache_age_minutes} min` : 'N/A';
        cacheAgeElement.textContent = ageText;
        console.log('✅ Cache age atualizado:', ageText);
    }
    
    const cacheExpiresElement = document.getElementById('cache-expires');
    if (cacheExpiresElement) {
        let expiresText;
        if (cacheInfo.expires_in_minutes !== undefined) {
            expiresText = `${cacheInfo.expires_in_minutes} min`;
        } else if (cacheInfo.cache_duration_minutes !== undefined) {
            expiresText = `${cacheInfo.cache_duration_minutes} min`;
        } else {
            expiresText = 'N/A';
        }
        cacheExpiresElement.textContent = expiresText;
        console.log('✅ Cache expires atualizado:', expiresText);
    }
}

updateDetails(data) {
    console.log('🔍 updateDetails chamada com:', data);
    
    if (!data || !data.current) return;

    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || 'N/A';
            console.log(`✅ ${id} atualizado:`, value);
        }
    };

    updateElement('next-tide', 
        data.current.next_tide ? 
        `${data.current.next_tide.type} ${data.current.next_tide.height?.toFixed(2)}m` : 'N/A');
        
    updateElement('wave-direction', 
        data.current.wave_direction ? `${data.current.wave_direction}°` : 'N/A');
        
    updateElement('pressure', 
        data.current.pressure ? `${Math.round(data.current.pressure)} hPa` : 'N/A');
        
    updateElement('data-quality', 
        `${data.metadata?.quality_score || 0}% (${data.metadata?.source_mode?.toUpperCase() || 'HYBRID'})`);
}

updateCharts(forecast) {
    console.log('🔍 updateCharts chamada com:', forecast);
    
    if (!forecast || forecast.length === 0) {
        console.log('⚠️ Sem dados de previsão para gráficos');
        return;
    }
    
    const labels = forecast.map(f => 
        new Date(f.time).toLocaleTimeString('pt-PT', { 
            hour: '2-digit', 
            minute: '2-digit' 
        })
    );
    
    const waveData = forecast.map(f => f.wave_height || null);
    const tideData = forecast.map(f => f.sea_level || f.tide_level || null);
    
    if (this.charts.waves) {
        this.charts.waves.data.labels = labels;
        this.charts.waves.data.datasets[0].data = waveData;
        this.charts.waves.update('none');
        console.log('✅ Gráfico de ondas atualizado');
    }
    
    if (this.charts.tides) {
        this.charts.tides.data.labels = labels;
        this.charts.tides.data.datasets[0].data = tideData;
        this.charts.tides.update('none');
        console.log('✅ Gráfico de marés atualizado');
    }
}

initCharts() {
    const chartOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { 
            legend: { display: false },
            tooltip: {
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'white',
                bodyColor: 'white'
            }
        },
        scales: {
            x: {
                grid: { color: 'rgba(100, 116, 139, 0.2)' },
                ticks: { color: 'rgba(100, 116, 139, 0.8)' }
            },
            y: {
                beginAtZero: true,
                grid: { color: 'rgba(100, 116, 139, 0.2)' },
                ticks: { color: 'rgba(100, 116, 139, 0.8)' }
            }
        }
    };

    const wavesCanvas = document.getElementById('waves-chart');
    if (wavesCanvas) {
        const wavesCtx = wavesCanvas.getContext('2d');
        this.charts.waves = new Chart(wavesCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    borderColor: '#3B82F6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: chartOptions
        });
        console.log('✅ Gráfico de ondas criado');
    }

    const tidesCanvas = document.getElementById('tides-chart');
    if (tidesCanvas) {
        const tidesCtx = tidesCanvas.getContext('2d');
        this.charts.tides = new Chart(tidesCtx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    data: [],
                    borderColor: '#10B981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4
                }]
            },
            options: chartOptions
        });
        console.log('✅ Gráfico de marés criado');
    }
}

updateLastUpdate() {
    const element = document.getElementById('last-update');
    if (element) {
        const timeString = new Date().toLocaleTimeString('pt-PT');
        element.textContent = timeString;
        console.log('✅ Última atualização:', timeString);
    }
}

showError() {
    console.error('💥 Mostrando interface de erro');
    
    const updateErrorElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            element.style.opacity = '0.5';
            element.style.color = '#ef4444';
        }
    };

    updateErrorElement('data-quality', 'Sistema Offline');
    updateErrorElement('wave-height', 'ERRO');
    updateErrorElement('water-temp', 'ERRO');
    updateErrorElement('tide-level', 'ERRO');
    updateErrorElement('wind-speed', 'ERRO');
}

startAutoUpdate() {
    console.log('⏰ Auto-atualização iniciada (5 minutos)');
    setInterval(() => {
        console.log('🔄 Auto-atualização executada');
        this.loadData();
    }, 5 * 60 * 1000);
}
    // INFORMAÇÕES DE CACHE
// ===============================
updateCacheInfo(cacheInfo) {
    console.log('🔍 updateCacheInfo chamada com:', cacheInfo);
    
    if (!cacheInfo) {
        console.warn('⚠️ cacheInfo é null/undefined');
        return;
    }
    
    const cacheStatusElement = document.getElementById('cache-status');
    if (cacheStatusElement) {
        const statusText = cacheInfo.served_from_cache ? '✅ Cache HIT' : '🔄 Dados Novos';
        cacheStatusElement.textContent = statusText;
        console.log('✅ Cache status atualizado:', statusText);
    }
    
    const cacheAgeElement = document.getElementById('cache-age');
    if (cacheAgeElement) {
        const ageText = cacheInfo.cache_age_minutes !== undefined ? 
            `${cacheInfo.cache_age_minutes} min` : 'N/A';
        cacheAgeElement.textContent = ageText;
        console.log('✅ Cache age atualizado:', ageText);
    }
    
    const cacheExpiresElement = document.getElementById('cache-expires');
    if (cacheExpiresElement) {
        let expiresText;
        if (cacheInfo.expires_in_minutes !== undefined) {
            expiresText = `${cacheInfo.expires_in_minutes} min`;
        } else if (cacheInfo.cache_duration_minutes !== undefined) {
            expiresText = `${cacheInfo.cache_duration_minutes} min`;
        } else {
            expiresText = 'N/A';
        }
        cacheExpiresElement.textContent = expiresText;
        console.log('✅ Cache expires atualizado:', expiresText);
    }
}

// ===============================
// DETALHES E FUNÇÕES FALTANDO
// ===============================
updateDetails(data) {
    console.log('🔍 updateDetails chamada com:', data);
    
    if (!data || !data.current) return;

    const updateElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value || 'N/A';
            console.log(`✅ ${id} atualizado:`, value);
        }
    };

    updateElement('next-tide', 
        data.current.next_tide ? 
        `${data.current.next_tide.type} ${data.current.next_tide.height?.toFixed(2)}m` : 'N/A');
        
    updateElement('wave-direction', 
        data.current.wave_direction ? `${data.current.wave_direction}°` : 'N/A');
        
    updateElement('pressure', 
        data.current.pressure ? `${Math.round(data.current.pressure)} hPa` : 'N/A');
        
    updateElement('data-quality', 
        `${data.metadata?.quality_score || 0}% (${data.metadata?.source_mode?.toUpperCase() || 'HYBRID'})`);
}

updateCharts(forecast) {
    console.log('🔍 updateCharts chamada com:', forecast);
    
    if (!forecast || forecast.length === 0) return;
    
    const labels = forecast.map(f => 
        new Date(f.time).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
    );
    
    const waveData = forecast.map(f => f.wave_height || null);
    const tideData = forecast.map(f => f.sea_level || f.tide_level || null);
    
    if (this.charts.waves) {
        this.charts.waves.data.labels = labels;
        this.charts.waves.data.datasets[0].data = waveData;
        this.charts.waves.update('none');
        console.log('✅ Gráfico de ondas atualizado');
    }
    
    if (this.charts.tides) {
        this.charts.tides.data.labels = labels;
        this.charts.tides.data.datasets[0].data = tideData;
        this.charts.tides.update('none');
        console.log('✅ Gráfico de marés atualizado');
    }
}

updateLastUpdate() {
    const element = document.getElementById('last-update');
    if (element) {
        const timeString = new Date().toLocaleTimeString('pt-PT');
        element.textContent = timeString;
        console.log('✅ Última atualização:', timeString);
    }
}

showError() {
    console.error('💥 Mostrando interface de erro');
    
    const updateErrorElement = (id, value) => {
        const element = document.getElementById(id);
        if (element) {
            element.textContent = value;
            element.style.opacity = '0.5';
            element.style.color = '#ef4444';
        }
    };

    updateErrorElement('data-quality', 'Sistema Offline');
    updateErrorElement('wave-height', 'ERRO');
    updateErrorElement('water-temp', 'ERRO');
    updateErrorElement('tide-level', 'ERRO');
    updateErrorElement('wind-speed', 'ERRO');
}

    // ===============================
// FUNÇÃO DE DEBUG
// ===============================
debugElements() {
    console.log('🔍 Verificando elementos HTML:');
    
    const elements = [
        'cache-status', 'cache-age', 'cache-expires',
        'wave-height', 'water-temp', 'tide-level', 'wind-speed',
        'wave-source', 'temp-source', 'tide-source', 'wind-source',
        'sources-status', 'waves-chart', 'tides-chart',
        'next-tide', 'wave-direction', 'pressure', 'data-quality'
    ];
    
    elements.forEach(id => {
        const element = document.getElementById(id);
        console.log(`- ${id}:`, element ? '✅ Encontrado' : '❌ NÃO ENCONTRADO');
    });
    
    const radios = document.querySelectorAll('input[name="data-source"]');
    console.log(`- Radio buttons: ${radios.length} encontrados`);
}
    // ===============================
    
// ===============================
// INFORMAÇÕES DE CACHE (CORRIGIDA)
// ===============================
updateCacheInfo(cacheInfo) {
    console.log('🔍 updateCacheInfo chamada com:', cacheInfo);
    
    if (!cacheInfo) {
        console.warn('⚠️ cacheInfo é null/undefined');
        return;
    }
    
    // Status do cache
    const cacheStatusElement = document.getElementById('cache-status');
    if (cacheStatusElement) {
        const statusText = cacheInfo.served_from_cache ? '✅ Cache HIT' : '🔄 Dados Novos';
        cacheStatusElement.textContent = statusText;
        console.log('✅ Cache status atualizado:', statusText);
    } else {
        console.error('❌ Elemento cache-status não encontrado');
    }
    
    // Idade do cache
    const cacheAgeElement = document.getElementById('cache-age');
    if (cacheAgeElement) {
        const ageText = cacheInfo.cache_age_minutes !== undefined ? 
            `${cacheInfo.cache_age_minutes} min` : 'N/A';
        cacheAgeElement.textContent = ageText;
        console.log('✅ Cache age atualizado:', ageText);
    } else {
        console.error('❌ Elemento cache-age não encontrado');
    }
    
    // Quando expira
    const cacheExpiresElement = document.getElementById('cache-expires');
    if (cacheExpiresElement) {
        let expiresText;
        if (cacheInfo.expires_in_minutes !== undefined) {
            expiresText = `${cacheInfo.expires_in_minutes} min`;
        } else if (cacheInfo.cache_duration_minutes !== undefined) {
            expiresText = `${cacheInfo.cache_duration_minutes} min`;
        } else {
            expiresText = 'N/A';
        }
        cacheExpiresElement.textContent = expiresText;
        console.log('✅ Cache expires atualizado:', expiresText);
    } else {
        console.error('❌ Elemento cache-expires não encontrado');
    }
}
    // ===============================
    // DETALHES ADICIONAIS
    // ===============================
    updateDetails(data) {
        if (!data || !data.current) return;

        const updateElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) element.textContent = value || 'N/A';
        };

        // Próxima maré
        updateElement('next-tide', 
            data.current.next_tide ? 
            `${data.current.next_tide.type} ${data.current.next_tide.height?.toFixed(2)}m` : 'N/A');
            
        // Direção das ondas
        updateElement('wave-direction', 
            data.current.wave_direction ? `${data.current.wave_direction}°` : 'N/A');
            
        // Pressão atmosférica
        updateElement('pressure', 
            data.current.pressure ? `${Math.round(data.current.pressure)} hPa` : 'N/A');
            
        // Qualidade dos dados
        updateElement('data-quality', 
            `${data.metadata?.quality_score || 0}% (${data.metadata?.source_mode?.toUpperCase() || 'HYBRID'})`);
    }

    // ===============================
    // GRÁFICOS
    // ===============================
    updateCharts(forecast) {
        if (!forecast || forecast.length === 0) {
            console.log('⚠️ Sem dados de previsão para gráficos');
            return;
        }
        
        const labels = forecast.map(f => 
            new Date(f.time).toLocaleTimeString('pt-PT', { 
                hour: '2-digit', 
                minute: '2-digit' 
            })
        );
        
        const waveData = forecast.map(f => f.wave_height || null);
        const tideData = forecast.map(f => f.sea_level || f.tide_level || null);
        
        // Gráfico de ondas
        if (this.charts.waves) {
            this.charts.waves.data.labels = labels;
            this.charts.waves.data.datasets[0].data = waveData;
            this.charts.waves.update('none');
        }
        
        // Gráfico de marés
        if (this.charts.tides) {
            this.charts.tides.data.labels = labels;
            this.charts.tides.data.datasets[0].data = tideData;
            this.charts.tides.update('none');
        }
    }

    initCharts() {
        const chartOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { 
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white'
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(100, 116, 139, 0.2)' },
                    ticks: { color: 'rgba(100, 116, 139, 0.8)' }
                },
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(100, 116, 139, 0.2)' },
                    ticks: { color: 'rgba(100, 116, 139, 0.8)' }
                }
            }
        };

        // Gráfico de ondas
        const wavesCanvas = document.getElementById('waves-chart');
        if (wavesCanvas) {
            const wavesCtx = wavesCanvas.getContext('2d');
            this.charts.waves = new Chart(wavesCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        borderColor: '#3B82F6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: chartOptions
            });
            console.log('✅ Gráfico de ondas criado');
        }

        // Gráfico de marés
        const tidesCanvas = document.getElementById('tides-chart');
        if (tidesCanvas) {
            const tidesCtx = tidesCanvas.getContext('2d');
            this.charts.tides = new Chart(tidesCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        data: [],
                        borderColor: '#10B981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 3,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: chartOptions
            });
            console.log('✅ Gráfico de marés criado');
        }
    }

    // ===============================
    // FUNÇÕES AUXILIARES
    // ===============================
    updateLastUpdate() {
        const element = document.getElementById('last-update');
        if (element) {
            element.textContent = new Date().toLocaleTimeString('pt-PT');
        }
    }

    showError() {
        console.error('💥 Mostrando interface de erro');
        
        const updateErrorElement = (id, value) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
                element.style.opacity = '0.5';
                element.style.color = '#ef4444'; // Vermelho para erro
            }
        };

        updateErrorElement('data-quality', 'Sistema Offline');
        updateErrorElement('wave-height', 'ERRO');
        updateErrorElement('water-temp', 'ERRO');
        updateErrorElement('tide-level', 'ERRO');
        updateErrorElement('wind-speed', 'ERRO');
        
        // Atualizar status das fontes para erro
        const statusContainer = document.getElementById('sources-status');
        if (statusContainer) {
            statusContainer.innerHTML = `
                <div class="col-span-full bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
                    <strong>Erro:</strong> Não foi possível carregar dados de nenhuma fonte.
                </div>
            `;
        }
    }

    startAutoUpdate() {
        console.log('⏰ Auto-atualização iniciada (5 minutos)');
        setInterval(() => {
            console.log('🔄 Auto-atualização executada');
            this.loadData();
        }, 5 * 60 * 1000); // 5 minutos
    }
}

// ===============================
// INICIALIZAÇÃO GLOBAL
// ===============================
document.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Inicializando Dashboard Oceanográfico de Peniche');
    
    // Verificar se Chart.js está disponível
    if (typeof Chart === 'undefined') {
        console.error('❌ Chart.js não encontrado! Certifique-se de que está incluído no HTML.');
        return;
    }
    
    // Inicializar dashboard
    try {
        window.oceanDashboard = new RealDataOceanDashboard();
        console.log('✅ Dashboard inicializado com sucesso');
    } catch (error) {
        console.error('❌ Erro ao inicializar dashboard:', error);
    }
});

// Exportar para debug global
window.RealDataOceanDashboard = RealDataOceanDashboard;