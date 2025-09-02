const express = require('express');
const fetch = require('node-fetch');
const cors = require('cors');
const path = require('path');
require('dotenv').config();
const NodeCache = require('node-cache');
const rateLimit = require('express-rate-limit');

const app = express();
const PORT = process.env.PORT || 3001;

const cache = new NodeCache({ stdTTL: 300, checkperiod: 120 });

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' }
});

app.use(limiter);
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '..')));

// Env
const CMEMS_USER = process.env.COPERNICUSMARINE_SERVICE_USERNAME;
const CMEMS_PASSWORD = process.env.COPERNICUSMARINE_SERVICE_PASSWORD;
const THINGSPEAK_CHANNEL_ID = process.env.THINGSPEAK_CHANNEL_ID;
const THINGSPEAK_READ_API_KEY = process.env.THINGSPEAK_READ_API_KEY;
const OWM_API_KEY = process.env.OWM_API_KEY;
const STORMGLASS_API_KEY = process.env.STORMGLASS_API_KEY;
const WEATHERAPI_KEY = process.env.WEATHERAPI_KEY;
const NASA_API_KEY = process.env.NASA_API_KEY;
const WORLDTIDES_API_KEY = process.env.WORLDTIDES_API_KEY;

function validarApiKeys() {
  const requiredKeys = ['OWM_API_KEY', 'NASA_API_KEY', 'WEATHERAPI_KEY', 'STORMGLASS_API_KEY'];
  const optionalKeys = ['THINGSPEAK_CHANNEL_ID', 'THINGSPEAK_READ_API_KEY', 'WORLDTIDES_API_KEY'];
  console.log('🔑 Verificando API Keys...');
  requiredKeys.forEach((key) => {
    if (process.env[key]) console.log(`✅ ${key} configurada`);
    else console.log(`❌ ${key} FALTANDO - funcionalidade limitada`);
  });
  optionalKeys.forEach((key) => {
    if (process.env[key]) console.log(`✅ ${key} configurada`);
    else console.log(`⚠️ ${key} não configurada (opcional)`);
  });
}

async function safeFetchJson(url, options = {}) {
  const res = await fetch(url, options);
  if (!res.ok) {
    const text = await res.text().catch(() => res.statusText);
    const err = new Error(`HTTP ${res.status} - ${res.statusText}`);
    err.status = res.status;
    err.body = text;
    throw err;
  }
  return res.json();
}

// ThingSpeak
app.get('/api/thingspeak', async (req, res) => {
  const cacheKey = `thingspeak_${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    if (!THINGSPEAK_CHANNEL_ID || !THINGSPEAK_READ_API_KEY) {
      return res.status(500).json({ error: 'ThingSpeak não configurado', help: 'THINGSPEAK_CHANNEL_ID e THINGSPEAK_READ_API_KEY' });
    }
    const results = req.query.results || 1;
    const url = `https://api.thingspeak.com/channels/${THINGSPEAK_CHANNEL_ID}/feeds.json?api_key=${THINGSPEAK_READ_API_KEY}&results=${encodeURIComponent(results)}`;
    const data = await safeFetchJson(url);
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (e) {
    console.error('ThingSpeak:', e);
    return res.status(e.status || 500).json({ error: 'ThingSpeak', details: e.body || e.message });
  }
});

// OpenWeather One Call 3.0
app.get('/api/openweathermap', async (req, res) => {
  const cacheKey = `openweathermap_${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    if (!OWM_API_KEY) return res.status(500).json({ error: 'OWM_API_KEY não configurada' });
    const { lat, lon, exclude = '', units = 'metric', lang = 'pt' } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'lat/lon obrigatórios', example: '/api/openweathermap?lat=39.36&lon=-9.16' });
    }
    const url = `https://api.openweathermap.org/data/3.0/onecall?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&exclude=${encodeURIComponent(exclude)}&units=${encodeURIComponent(units)}&lang=${encodeURIComponent(lang)}&appid=${OWM_API_KEY}`;
    const data = await safeFetchJson(url);
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (e) {
    console.error('OpenWeatherMap:', e);
    return res.status(e.status || 500).json({ error: 'OpenWeatherMap', details: e.body || e.message });
  }
});

// WeatherAPI
app.get('/api/weatherapi', async (req, res) => {
  const cacheKey = `weatherapi_${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    if (!WEATHERAPI_KEY) return res.status(500).json({ error: 'WEATHERAPI_KEY não configurada' });
    const { lat, lon, lang = 'pt', days = 2 } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat/lon obrigatórios', example: '/api/weatherapi?lat=39.36&lon=-9.16&days=2' });
    const q = `${lat},${lon}`;
    const url = `https://api.weatherapi.com/v1/forecast.json?key=${WEATHERAPI_KEY}&q=${encodeURIComponent(q)}&days=${encodeURIComponent(days)}&aqi=no&alerts=no&lang=${encodeURIComponent(lang)}`;
    const data = await safeFetchJson(url);
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (e) {
    console.error('WeatherAPI:', e);
    return res.status(e.status || 500).json({ error: 'WeatherAPI', details: e.body || e.message });
  }
});

// WorldTides
app.get('/api/worldtides', async (req, res) => {
  const cacheKey = `worldtides_${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    if (!WORLDTIDES_API_KEY) return res.status(500).json({ error: 'WORLDTIDES_API_KEY não configurada' });
    const { lat, lon, extremes, length } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat/lon obrigatórios', example: '/api/worldtides?lat=39.3558&lon=-9.38112&extremes=1&length=86400' });
    let url = `https://www.worldtides.info/api/v3?lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lon)}&key=${WORLDTIDES_API_KEY}`;
    if (extremes) url += `&extremes=${encodeURIComponent(extremes)}`;
    if (length) url += `&length=${encodeURIComponent(length)}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const resW = await fetch(url, { signal: controller.signal, headers: { 'User-Agent': 'EstacaoMeteorologica/1.0', Accept: 'application/json' } });
    clearTimeout(timeoutId);
    if (!resW.ok) {
      const errorText = await resW.text().catch(() => 'Erro desconhecido');
      return res.status(resW.status).json({ error: 'WorldTides', status: resW.status, details: errorText });
    }
    const data = await resW.json();
    if (data.error) return res.status(400).json({ error: `WorldTides: ${data.error}`, code: data.code || 'UNKNOWN' });
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (e) {
    if (e.name === 'AbortError') return res.status(408).json({ error: 'Timeout na API WorldTides' });
    console.error('WorldTides:', e);
    return res.status(500).json({ error: 'Erro interno WorldTides', message: e.message });
  }
});

// WorldTides test
app.get('/api/worldtides/test', async (_req, res) => {
  const cacheKey = 'worldtides_test';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    if (!WORLDTIDES_API_KEY) {
      const result = { status: 'error', message: 'WORLDTIDES_API_KEY não configurada no .env', configured: false };
      cache.set(cacheKey, result);
      return res.json(result);
    }
    const testUrl = `https://www.worldtides.info/api/v3?lat=39.3558&lon=-9.38112&extremes=1&length=3600&key=${WORLDTIDES_API_KEY}`;
    const data = await safeFetchJson(testUrl);
    const ok = !data.error;
    const result = ok
      ? { status: 'success', message: 'WorldTides API configurada corretamente', configured: true, callCount: data.callCount || 'N/A', extremes: data.extremes ? data.extremes.length : 0 }
      : { status: 'error', message: data.error || 'Erro na API WorldTides', configured: true, apiError: true };
    cache.set(cacheKey, result);
    return res.json(result);
  } catch (e) {
    const result = { status: 'error', message: `Erro ao testar WorldTides: ${e.message}`, configured: true, networkError: true };
    cache.set(cacheKey, result);
    return res.json(result);
  }
});

// NASA APOD
app.get('/api/nasa/apod', async (_req, res) => {
  const cacheKey = 'nasa_apod';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    if (!NASA_API_KEY) return res.status(500).json({ error: 'NASA_API_KEY não configurada' });
    const data = await safeFetchJson(`https://api.nasa.gov/planetary/apod?api_key=${NASA_API_KEY}`);
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (e) {
    console.error('NASA APOD:', e);
    return res.status(e.status || 500).json({ error: 'NASA APOD', details: e.body || e.message });
  }
});

// NASA imagens Portugal
app.get('/api/nasa/portugal', async (_req, res) => {
  const cacheKey = 'nasa_portugal';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    const data = await safeFetchJson('https://images-api.nasa.gov/search?q=Portugal&media_type=image');
    const item = data && data.collection && Array.isArray(data.collection.items) ? data.collection.items : null;
    if (!item || !item.links || !item.links || !item.links.href || !item.data || !item.data) {
      return res.status(404).json({ error: 'Imagem de Portugal não encontrada.' });
    }
    const result = { url: item.links.href, title: item.data.title, description: item.data.description };
    cache.set(cacheKey, result);
    return res.json(result);
  } catch (e) {
    console.error('NASA Search:', e);
    return res.status(e.status || 500).json({ error: 'NASA Search', details: e.body || e.message });
  }
});

// Open‑Meteo (formata para UI)
app.get('/api/openmeteo', async (req, res) => {
  const cacheKey = `openmeteo_${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    const { lat, lon, lang = 'pt', tz = 'auto', hours = 24 } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat/lon obrigatórios', example: '/api/openmeteo?lat=39.3606&lon=-9.1575' });
    const hourly = [
      'temperature_2m','relative_humidity_2m','precipitation_probability','precipitation',
      'wind_speed_10m','wind_gusts_10m','wind_direction_10m','pressure_msl','weather_code','cloud_cover'
    ].join(',');
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${encodeURIComponent(lat)}&longitude=${encodeURIComponent(lon)}&hourly=${encodeURIComponent(hourly)}&forecast_days=2&timezone=${encodeURIComponent(tz)}&language=${encodeURIComponent(lang)}`;
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
    console.error('Open-Meteo:', e);
    return res.status(e.status || 500).json({ error: 'Open-Meteo', details: e.body || e.message });
  }
});

// Stormglass
app.get('/api/stormglass', async (req, res) => {
  const cacheKey = `stormglass_${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    if (!STORMGLASS_API_KEY) return res.status(500).json({ error: 'STORMGLASS_API_KEY não configurada' });
    const { lat, lon, hours = 24 } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat/lon obrigatórios' });
    const end = new Date();
    const start = new Date(end.getTime() - Number(hours) * 3600 * 1000);
    const params = [
      'airTemperature','windSpeed','windGust','windDirection',
      'waveHeight','waveDirection','wavePeriod','swellHeight','swellDirection','swellPeriod','waterTemperature'
    ].join(',');
    const url = `https://api.stormglass.io/v2/weather/point?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lon)}&params=${encodeURIComponent(params)}&source=sg&start=${Math.floor(start.getTime()/1000)}&end=${Math.floor(end.getTime()/1000)}`;
    // Muitos planos usam Authorization: <API_KEY> sem 'Bearer'
    const data = await safeFetchJson(url, { headers: { Authorization: STORMGLASS_API_KEY } });
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (e) {
    console.error('Stormglass:', e);
    return res.status(e.status || 500).json({ error: 'Stormglass', details: e.body || e.message });
  }
});

// Sunrise/Sunset
app.get('/api/sun', async (req, res) => {
  const cacheKey = `sun_${JSON.stringify(req.query)}`;
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  try {
    const { lat, lon, date = 'today', tz = 'auto', format = '24' } = req.query;
    if (!lat || !lon) return res.status(400).json({ error: 'lat/lon obrigatórios', example: '/api/sun?lat=39.36&lon=-9.16' });
    const url = `https://api.sunrisesunset.io/json?lat=${encodeURIComponent(lat)}&lng=${encodeURIComponent(lon)}&date=${encodeURIComponent(date)}&time_format=${encodeURIComponent(format)}&timezone=${encodeURIComponent(tz)}`;
    const data = await safeFetchJson(url);
    cache.set(cacheKey, data);
    return res.json(data);
  } catch (e) {
    console.error('SunriseSunset:', e);
    return res.status(e.status || 500).json({ error: 'SunriseSunset', details: e.body || e.message });
  }
});

// Copernicus placeholders
app.get('/api/copernicus/emergency', async (_req, res) => {
  return res.status(501).json({ error: 'Não implementado', help: 'Requer API/credenciais próprias do serviço.' });
});
app.get('/api/copernicus/images', async (_req, res) => {
  return res.status(501).json({ error: 'Não implementado', help: 'STAC/Data Space requer OAuth.' });
});
app.get('/api/copernicus/timeseries', async (_req, res) => {
  return res.status(501).json({ error: 'Não implementado', help: 'CMEMS Motu entrega NetCDF/POST.' });
});
app.get('/api/copernicus/airquality', async (_req, res) => {
  return res.status(501).json({ error: 'Não implementado', help: 'CAMS/ADS requer chave e endpoint específicos.' });
});

// Status
app.get('/api/status', (req, res) => {
  const cacheKey = 'status';
  const cached = cache.get(cacheKey);
  if (cached) return res.json(cached);
  const status = {
    server: 'online',
    timestamp: new Date().toISOString(),
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
  cache.set(cacheKey, status);
  return res.json(status);
});

// 404 handler
app.use((req, res) => {
  if (req.path.startsWith('/api/')) {
    res.status(404).json({
      error: 'Endpoint não encontrado',
      path: req.path,
      availableEndpoints: [
        '/api/status', '/api/openweathermap', '/api/nasa/apod', '/api/nasa/portugal',
        '/api/worldtides', '/api/worldtides/test', '/api/thingspeak', '/api/openmeteo',
        '/api/stormglass', '/api/sun', '/api/weatherapi',
        '/api/copernicus/emergency', '/api/copernicus/images', '/api/copernicus/timeseries', '/api/copernicus/airquality'
      ]
    });
  } else {
    res.status(404).sendFile(path.join(__dirname, '..', 'index.html'));
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Servidor em http://localhost:${PORT}`);
  console.log(`📁 Estáticos: ${path.join(__dirname, '..')}`);
  validarApiKeys();
});
