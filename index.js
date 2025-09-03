const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

// Configuração de cache com tempo de vida de 5 minutos
const cache = new NodeCache({ 
  stdTTL: 300, 
  checkperiod: 120,
  useClones: false // Melhoria de performance
});

// Rate limiting mais robusto
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo de 100 requisições por janela
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
  skip: (req) => {
    // Não aplicar rate limiting para requisições locais em desenvolvimento
    return process.env.NODE_ENV === 'development' && req.ip === '::ffff:127.0.0.1';
  }
});
// Servir arquivos estáticos com configurações específicas
app.use(express.static(path.join(__dirname, '..'), {
  index: false,
  dotfiles: 'ignore',
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath);
    const mimeTypes = {
      '.css': 'text/css',
      '.js': 'application/javascript',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf'
    };
    
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  }
}));

// Rotas explícitas para arquivos críticos
app.get(['/style.css', '/script.js', '/config.js', '/favicon.ico'], (req, res) => {
  const filePath = path.join(__dirname, '..', req.path);
  res.sendFile(filePath);
});

// Middlewares
app.use(limiter);
app.use(cors({
  origin: function(origin, callback) {
    // Permitir requests sem origin (como mobile apps ou curl requests)
    if (!origin) return callback(null, true);
    
    if (
      process.env.NODE_ENV === 'development' ||
      origin === process.env.FRONTEND_URL ||
      origin.includes('localhost') ||
      origin.includes('127.0.0.1')
    ) {
      callback(null, true);
    } else {
      callback(new Error('Não permitido por CORS'));
    }
  },
  credentials: true
}));

// Middleware para prevenir carregamento duplo de scripts e definir MIME types corretos
app.use((req, res, next) => {
  if (req.path.match(/\.(js|css|json|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
    const ext = path.extname(req.path);
    const mimeTypes = {
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.png': 'image/png',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.gif': 'image/gif',
      '.svg': 'image/svg+xml',
      '.ico': 'image/x-icon',
      '.woff': 'font/woff',
      '.woff2': 'font/woff2',
      '.ttf': 'font/ttf',
      '.eot': 'application/vnd.ms-fontobject'
    };
    
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
      res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache de 1 hora
    }
  }
  next();
});
app.use(express.json({ limit: '10mb' }));
// Variáveis de ambiente
const CMEMS_USER = process.env.COPERNICUSMARINE_SERVICE_USERNAME;
const CMEMS_PASSWORD = process.env.COPERNICUSMARINE_SERVICE_PASSWORD;
const THINGSPEAK_CHANNEL_ID = process.env.THINGSPEAK_CHANNEL_ID;
const THINGSPEAK_READ_API_KEY = process.env.THINGSPEAK_READ_API_KEY;
const OWM_API_KEY = process.env.OWM_API_KEY;
const STORMGLASS_API_KEY = process.env.STORMGLASS_API_KEY;
const WEATHERAPI_KEY = process.env.WEATHERAPI_KEY;
const NASA_API_KEY = process.env.NASA_API_KEY;
const WORLDTIDES_API_KEY = process.env.WORLDTIDES_API_KEY;

// Validação de API Keys
function validarApiKeys() {
  const requiredKeys = ['OWM_API_KEY', 'NASA_API_KEY', 'WEATHERAPI_KEY', 'STORMGLASS_API_KEY'];
  const optionalKeys = ['THINGSPEAK_CHANNEL_ID', 'THINGSPEAK_READ_API_KEY', 'WORLDTIDES_API_KEY', 'COPERNICUSMARINE_SERVICE_USERNAME', 'COPERNICUSMARINE_SERVICE_PASSWORD'];
  
  console.log('🔑 Verificando API Keys...');
  
  requiredKeys.forEach((key) => {
    if (process.env[key]) {
      console.log(`✅ ${key} configurada`);
    } else {
      console.log(`❌ ${key} FALTANDO - funcionalidade limitada`);
    }
  });
  
  optionalKeys.forEach((key) => {
    if (process.env[key]) {
      console.log(`✅ ${key} configurada`);
    } else {
      console.log(`⚠️ ${key} não configurada (opcional)`);
    }
  });
}

// Função de fetch segura com timeout
async function safeFetchJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeout || 10000);
  
  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    
    if (!res.ok) {
      const text = await res.text().catch(() => res.statusText);
      const err = new Error(`HTTP ${res.status} - ${res.statusText}`);
      err.status = res.status;
      err.body = text;
      throw err;
    }
    
    return await res.json();
  } finally {
    clearTimeout(timeout);
  }
}

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// ThingSpeak
app.get('/api/thingspeak', async (req, res) => {
  const cacheKey = `thingspeak_${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  
  try {
    if (!THINGSPEAK_CHANNEL_ID || !THINGSPEAK_READ_API_KEY) {
      return res.status(500).json({ 
        error: 'ThingSpeak não configurado', 
        help: 'THINGSPEAK_CHANNEL_ID e THINGSPEAK_READ_API_KEY necessários no .env' 
      });
    }
    
    const results = req.query.results || 1;
    const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_READ_API_KEY}&results=${encodeURIComponent(results)}`;
    
    const data = await safeFetchJson(url);
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (e) {
    console.error('ThingSpeak Error:', e.message);
    return res.status(e.status || 500).json({ 
      error: 'Erro ao acessar ThingSpeak', 
      details: process.env.NODE_ENV === 'development' ? e.message : 'Erro interno'
    });
  }
});

// OpenWeather One Call 3.0
app.get('/api/openweathermap', async (req, res) => {
  const cacheKey = `openweathermap_${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  
  try {
    if (!OWM_API_KEY) {
      return res.status(500).json({ 
        error: 'OpenWeatherMap não configurado', 
        help: 'OWM_API_KEY necessária no .env' 
      });
    }
    
    const { lat, lon, exclude = '', units = 'metric', lang = 'pt' } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ 
        error: 'Parâmetros obrigatórios faltando', 
        example: '/api/openweathermap?lat=39.36&lon=-9.16',
        required: ['lat', 'lon']
      });
    }
    
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&exclude=${encodeURIComponent(exclude)}&units=${encodeURIComponent(units)}&lang=${encodeURIComponent(lang)}&appid=${OWM_API_KEY}`;
    
    const data = await safeFetchJson(url);
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (e) {
    console.error('OpenWeatherMap Error:', e.message);
    return res.status(e.status || 500).json({ 
      error: 'Erro ao acessar OpenWeatherMap', 
      details: process.env.NODE_ENV === 'development' ? e.message : 'Erro interno'
    });
  }
});

// WeatherAPI
app.get('/api/weatherapi', async (req, res) => {
  const cacheKey = `weatherapi_${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  
  try {
    if (!WEATHERAPI_KEY) {
      return res.status(500).json({ 
        error: 'WeatherAPI não configurada', 
        help: 'WEATHERAPI_KEY necessária no .env' 
      });
    }
    
    const { lat, lon, lang = 'pt', days = 2 } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ 
        error: 'Parâmetros obrigatórios faltando', 
        example: '/api/weatherapi?lat=39.36&lon=-9.16&days=2',
        required: ['lat', 'lon']
      });
    }
    
    const q = `${lat},${lon}`;
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(q)}&days=${encodeURIComponent(days)}&aqi=no&alerts=no&lang=${encodeURIComponent(lang)}`;
    
    const data = await safeFetchJson(url);
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (e) {
    console.error('WeatherAPI Error:', e.message);
    return res.status(e.status || 500).json({ 
      error: 'Erro ao acessar WeatherAPI', 
      details: process.env.NODE_ENV === 'development' ? e.message : 'Erro interno'
    });
  }
});

// WorldTides
app.get('/api/worldtides', async (req, res) => {
  const cacheKey = `worldtides_${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  
  try {
    if (!WORLDTIDES_API_KEY) {
      return res.status(500).json({ 
        error: 'WorldTides não configurado', 
        help: 'WORLDTIDES_API_KEY necessária no .env' 
      });
    }
    
    const { lat, lon, extremes, length } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ 
        error: 'Parâmetros obrigatórios faltando', 
        example: '/api/worldtides?lat=39.3558&lon=-9.38112&extremes=1&length=86400',
        required: ['lat', 'lon']
      });
    }
    
    let url = `https://www.worldtides.info/api/v3?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&key=${WORLDTIDES_API_KEY}`;
    if (extremes) url += `&extremes=${encodeURIComponent(extremes)}`;
    if (length) url += `&length=${encodeURIComponent(length)}`;
    
    const data = await safeFetchJson(url, {
      headers: { 
        'User-Agent': 'EstacaoMeteorologica/1.0', 
        'Accept': 'application/json' 
      }
    });
    
    if (data.error) {
      return res.status(400).json({ 
        error: `WorldTides: ${data.error}`, 
        code: data.code || 'UNKNOWN' 
      });
    }
    
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (e) {
    if (e.name === 'AbortError') {
      return res.status(408).json({ error: 'Timeout na API WorldTides' });
    }
    
    console.error('WorldTides Error:', e.message);
    return res.status(e.status || 500).json({ 
      error: 'Erro ao acessar WorldTides', 
      details: process.env.NODE_ENV === 'development' ? e.message : 'Erro interno'
    });
  }
});

// WorldTides test
app.get('/api/worldtides/test', async (_req, res) => {
  const cacheKey = 'worldtides_test';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  
  try {
    if (!WORLDTIDES_API_KEY) {
      const result = { 
        status: 'error', 
        message: 'WORLDTIDES_API_KEY não configurada no .env', 
        configured: false 
      };
      cache.set(cacheKey, result, 60); // Cache menor para testes
      return res.json(result);
    }
    
    const testUrl = `https://www.worldtides.info/api/v3?lat=39.3558&lon=-9.38112&extremes=1&length=3600&key=${WORLDTIDES_API_KEY}`;
    const data = await safeFetchJson(testUrl);
    
    const ok = !data.error;
    const result = ok ? {
      status: 'success', 
      message: 'WorldTides API configurada corretamente', 
      configured: true, 
      callCount: data.callCount || 'N/A', 
      extremes: data.extremes ? data.extremes.length : 0 
    } : {
      status: 'error', 
      message: data.error || 'Erro na API WorldTides', 
      configured: true, 
      apiError: true 
    };
    
    cache.set(cacheKey, result, 60); // Cache menor para testes
    return res.json(result);
  } catch (e) {
    const result = { 
      status: 'error', 
      message: `Erro ao testar WorldTides: ${e.message}`, 
      configured: true, 
      networkError: true 
    };
    cache.set(cacheKey, result, 60);
    return res.json(result);
  }
});

// NASA APOD
app.get('/api/nasa/apod', async (_req, res) => {
  const cacheKey = 'nasa_apod';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  
  try {
    if (!NASA_API_KEY) {
      return res.status(500).json({ 
        error: 'NASA API não configurada', 
        help: 'NASA_API_KEY necessária no .env' 
      });
    }
    
    const data = await safeFetchJson(`https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`);
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (e) {
    console.error('NASA APOD Error:', e.message);
    return res.status(e.status || 500).json({ 
      error: 'Erro ao acessar NASA APOD', 
      details: process.env.NODE_ENV === 'development' ? e.message : 'Erro interno'
    });
  }
});

// NASA imagens Portugal
app.get('/api/nasa/portugal', async (_req, res) => {
  const cacheKey = 'nasa_portugal';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  
  try {
    const data = await safeFetchJson('https://images-api.nasa.gov/search?q=Portugal&media_type=image');
    const items = data?.collection?.items || [];
    const item = items[0] || null;
    
    if (!item || !item.links?.[0]?.href || !item.data?.[0]) {
      return res.status(404).json({ error: 'Imagem de Portugal não encontrada.' });
    }
    
    const result = { 
      url: item.links[0].href, 
      title: item.data[0].title, 
      description: item.data[0].description 
    };
    
    cache.set(cacheKey, result);
    return res.json(result);
  } catch (e) {
    console.error('NASA Search Error:', e.message);
    return res.status(e.status || 500).json({ 
      error: 'Erro ao buscar imagens da NASA', 
      details: process.env.NODE_ENV === 'development' ? e.message : 'Erro interno'
    });
  }
});

// Open-Meteo (formata para UI)
app.get('/api/openmeteo', async (req, res) => {
  const cacheKey = `openmeteo_${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  
  try {
    const { lat, lon, lang = 'pt', tz = 'auto', hours = 24 } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ 
        error: 'Parâmetros obrigatórios faltando', 
        example: '/api/openmeteo?lat=39.3606&lon=-9.1575',
        required: ['lat', 'lon']
      });
    }
    
    const hourlyParams = [
      'temperature_2m', 'relative_humidity_2m', 'precipitation_probability', 'precipitation',
      'wind_speed_10m', 'wind_gusts_10m', 'wind_direction_10m', 'pressure_msl', 'weather_code', 'cloud_cover'
    ].join(',');
    
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&hourly=${encodeURIComponent(hourlyParams)}&forecast_days=2&timezone=${encodeURIComponent(tz)}&language=${encodeURIComponent(lang)}`;
    
    const raw = await safeFetchJson(url);
    const time = raw?.hourly?.time || [];
    
    const toNum = (arr) => Array.isArray(arr) ? arr : [];
    const H = {
      temp: toNum(raw?.hourly?.temperature_2m),
      hum: toNum(raw?.hourly?.relative_humidity_2m),
      pop: toNum(raw?.hourly?.precipitation_probability),
      prcp: toNum(raw?.hourly?.precipitation),
      wspd: toNum(raw?.hourly?.wind_speed_10m),
      wgst: toNum(raw?.hourly?.wind_gusts_10m),
      wdir: toNum(raw?.hourly?.wind_direction_10m),
      pmsl: toNum(raw?.hourly?.pressure_msl),
      wcode: toNum(raw?.hourly?.weather_code),
      cloud: toNum(raw?.hourly?.cloud_cover)
    };
    
    const n = Math.min(Number(hours) || 24, time.length);
    const hourlyOut = time.slice(0, n).map((iso, i) => ({
      dt: Math.floor(new Date(iso).getTime() / 1000),
      temp: H.temp[i],
      humidity: H.hum[i],
      pop: (H.pop[i] ?? 0) / 100,
      precipitation: H.prcp[i],
      wind_speed: H.wspd[i],
      wind_gust: H.wgst[i],
      wind_deg: H.wdir[i],
      pressure: H.pmsl[i],
      clouds: H.cloud[i],
      weather: [{ id: H.wcode[i] }]
    }));
    
    const out = { hourly: hourlyOut };
    cache.set(cacheKey, out);
    return res.json(out);
  } catch (e) {
    console.error('Open-Meteo Error:', e.message);
    return res.status(e.status || 500).json({ 
      error: 'Erro ao acessar Open-Meteo', 
      details: process.env.NODE_ENV === 'development' ? e.message : 'Erro interno'
    });
  }
});

// Stormglass
app.get('/api/stormglass', async (req, res) => {
  const cacheKey = `stormglass_${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  
  try {
    if (!STORMGLASS_API_KEY) {
      return res.status(500).json({ 
        error: 'Stormglass não configurado', 
        help: 'STORMGLASS_API_KEY necessária no .env' 
      });
    }
    
    const { lat, lon, hours = 24 } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ 
        error: 'Parâmetros obrigatórios faltando', 
        required: ['lat', 'lon']
      });
    }
    
    const end = new Date();
    const start = new Date(end.getTime() - Number(hours) * 3600 * 1000);
    
    const params = [
      'airTemperature', 'windSpeed', 'windGust', 'windDirection',
      'waveHeight', 'waveDirection', 'wavePeriod', 'swellHeight', 'swellDirection', 'swellPeriod', 'waterTemperature'
    ].join(',');
    
    const url = `https://api.stormglass.io/v2/weather/point?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lon)}&params=${encodeURIComponent(params)}&source=sg&start=${Math.floor(start.getTime()/1000)}&end=${Math.floor(end.getTime()/1000)}`;
    
    const data = await safeFetchJson(url, { 
      headers: { 
        Authorization: STORMGLASS_API_KEY 
      } 
    });
    
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (e) {
    console.error('Stormglass Error:', e.message);
    return res.status(e.status || 500).json({ 
      error: 'Erro ao acessar Stormglass', 
      details: process.env.NODE_ENV === 'development' ? e.message : 'Erro interno'
    });
  }
});

// Sunrise/Sunset
app.get('/api/sun', async (req, res) => {
  const cacheKey = `sun_${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  
  try {
    const { lat, lon, date = 'today', tz = 'auto', format = '24' } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ 
        error: 'Parâmetros obrigatórios faltando', 
        example: '/api/sun?lat=39.36&lon=-9.16',
        required: ['lat', 'lon']
      });
    }
    
    const url = `https://api.sunrisesunset.io/json?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lon)}&date=${encodeURIComponent(date)}&time_format=${encodeURIComponent(format)}&timezone=${encodeURIComponent(tz)}`;
    
    const data = await safeFetchJson(url);
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (e) {
    console.error('SunriseSunset Error:', e.message);
    return res.status(e.status || 500).json({ 
      error: 'Erro ao acessar Sunrise/Sunset API', 
      details: process.env.NODE_ENV === 'development' ? e.message : 'Erro interno'
    });
  }
});

// Copernicus placeholders
app.get('/api/copernicus/emergency', async (_req, res) => {
  return res.status(501).json({ 
    error: 'Não implementado', 
    help: 'Requer API/credenciais próprias do serviço.' 
  });
});

app.get('/api/copernicus/images', async (_req, res) => {
  return res.status(501).json({ 
    error: 'Não implementado', 
    help: 'STAC/Data Space requer OAuth.' 
  });
});

app.get('/api/copernicus/timeseries', async (_req, res) => {
  return res.status(501).json({ 
    error: 'Não implementado', 
    help: 'CMEMS Motu entrega NetCDF/POST.' 
  });
});

app.get('/api/copernicus/airquality', async (_req, res) => {
  return res.status(501).json({ 
    error: 'Não implementado', 
    help: 'CAMS/ADS requer chave e endpoint específicos.' 
  });
});

// Status do servidor e APIs
app.get('/api/status', (req, res) => {
  const cacheKey = 'status';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  
  const status = {
    server: 'online',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    apis: {
      openweathermap: !!OWM_API_KEY,
      nasa: !!NASA_API_KEY,
      worldtides: !!WORLDTIDES_API_KEY,
      thingspeak: !!(THINGSPEAK_CHANNEL_ID && THINGSPEAK_READ_API_KEY),
      stormglass: !!STORMGLASS_API_KEY,
      weatherapi: !!WEATHERAPI_KEY,
      copernicus: !!(CMEMS_USER && CMEMS_PASSWORD)
    }
  };
  
  cache.set(cacheKey, status, 30); // Cache de 30 segundos para status
  return res.json(status);
});

// Rota de documentação da API
app.get('/api', (_req, res) => {
  res.json({
    message: 'API da Estação Meteorológica',
    version: '1.0.0',
    endpoints: [
      { path: '/api/health', method: 'GET', description: 'Health check do servidor' },
      { path: '/api/status', method: 'GET', description: 'Status das APIs configuradas' },
      { path: '/api/thingspeak', method: 'GET', description: 'Dados do ThingSpeak' },
      { path: '/api/openweathermap', method: 'GET', description: 'Previsão do tempo (OpenWeatherMap)' },
      { path: '/api/weatherapi', method: 'GET', description: 'Previsão do tempo (WeatherAPI)' },
      { path: '/api/worldtides', method: 'GET', description: 'Dados de marés (WorldTides)' },
      { path: '/api/worldtides/test', method: 'GET', description: 'Teste de conexão com WorldTides' },
      { path: '/api/nasa/apod', method: 'GET', description: 'Astronomy Picture of the Day (NASA)' },
      { path: '/api/nasa/portugal', method: 'GET', description: 'Imagens de Portugal (NASA)' },
      { path: '/api/openmeteo', method: 'GET', description: 'Previsão do tempo (Open-Meteo)' },
      { path: '/api/stormglass', method: 'GET', description: 'Dados marítimos (Stormglass)' },
      { path: '/api/sun', method: 'GET', description: 'Nascer e pôr do sol' },
      { path: '/api/copernicus/*', method: 'GET', description: 'Endpoints Copernicus (não implementados)' }
    ]
  });
});

// Manipulador de erros global
app.use((err, _req, res, _next) => {
  console.error('Erro não tratado:', err);
  res.status(500).json({ 
    error: 'Erro interno do servidor',
    details: process.env.NODE_ENV === 'development' ? err.message : 'Contacte o administrador'
  });
});

// Servir o frontend para todas as rotas não-API
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api/')) {
    res.sendFile(path.join(__dirname, '..', 'index.html'));
  }
});

// Rota para servir o frontend (SPA)
app.get('*', (req, res, next) => {
  // Ignora se for API ou arquivo específico
  if (req.path.startsWith('/api/') || 
      req.path.match(/\.(css|js|json|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
    return next();
  }
  
  // Serve index.html para todas as outras rotas
  res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// 404 handler - apenas para APIs e arquivos
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'Endpoint não encontrado',
      path: req.path,
      availableEndpoints: [
        '/api/health',
        '/api/status',
        '/api/openweathermap',
        '/api/nasa/apod',
        '/api/nasa/portugal',
        '/api/worldtides',
        '/api/worldtides/test',
        '/api/thingspeak',
        '/api/openmeteo',
        '/api/stormglass',
        '/api/sun',
        '/api/weatherapi',
        '/api/copernicus/emergency',
        '/api/copernicus/images',
        '/api/copernicus/timeseries',
        '/api/copernicus/airquality'
      ]
    });
  } else if (req.path.match(/\.(css|js|json|ico|png|jpg|jpeg|gif|svg|woff|woff2|ttf|eot)$/)) {
    res.status(404).json({ error: 'Arquivo não encontrado', path: req.path });
  } else {
    res.status(404).sendFile(path.join(__dirname, '..', 'index.html'));
  }
});
    
// Inicialização do servidor
app.listen(PORT, () => {
  console.log(`🚀 Servidor rodando em http://localhost:${PORT}`);
  console.log(`📁 Servindo arquivos estáticos de: ${path.join(__dirname, '..')}`);
  console.log(`🌍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
  validarApiKeys();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Desligando servidor Thanks! 🚀 ...');
  process.exit(0);
});