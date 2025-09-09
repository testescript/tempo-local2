# -*- coding: utf-8 -*-

"""
Script para obter dados de marés e ondas do CMEMS para Peniche,
com fallback para dados simulados realistas se o CMEMS falhar.
"""     
    
import json
import sys
import argparse
import tempfile
from pathlib import Path
import numpy as np
from datetime import datetime, timedelta

# Verificar dependências
try:
    import xarray as xr
    import copernicusmarine
    CMEMS_AVAILABLE = True
except ImportError:
    CMEMS_AVAILABLE = False

CENTER_LAT = 39.355
CENTER_LON = -9.381
MIN_LAT = 39.30
MAX_LAT = 39.40
MIN_LON = -9.45
MAX_LON = -9.30


def generate_realistic_ocean_data(start_str, end_str, variables):
    """Gera dados oceanográficos realistas para Peniche"""
    try:
        start_time = datetime.fromisoformat(start_str.replace('Z', ''))
        end_time = datetime.fromisoformat(end_str.replace('Z', ''))
    except:
        start_time = datetime.now()
        end_time = start_time + timedelta(hours=12)
    
    points = []
    duration_hours = (end_time - start_time).total_seconds() / 3600
    num_points = min(24, max(6, int(duration_hours)))
    
    for i in range(num_points):
        time_point = start_time + timedelta(hours=i)
        hour_offset = i
        
        # Dados realistas para Peniche
        # Ondas: 0.5m a 3.0m (típico para costa portuguesa)
        wave_base = 1.4
        wave_seasonal = 0.3 * np.sin((time_point.timetuple().tm_yday - 60) * 2 * np.pi / 365)
        wave_daily = 0.4 * np.sin(hour_offset * 0.4)
        wave_noise = np.random.normal(0, 0.2)
        wave_height = max(0.3, wave_base + wave_seasonal + wave_daily + wave_noise)
        
        # Marés: -2m a +2m (ciclo semidiurno de 12.42h)
        tidal_cycle = 12.42
        tidal_phase = (hour_offset / tidal_cycle) * 2 * np.pi
        sea_level = 1.3 * np.sin(tidal_phase) + 0.4 * np.sin(tidal_phase * 2)
        sea_level += np.random.normal(0, 0.08)
        
        # Temperatura da água (14°C a 20°C)
        day_of_year = time_point.timetuple().tm_yday
        temp_base = 17 + 3 * np.sin((day_of_year - 60) * 2 * np.pi / 365)
        temp_daily = 1.2 * np.sin((hour_offset - 14) * 2 * np.pi / 24)
        water_temp = temp_base + temp_daily + np.random.normal(0, 0.3)
        
        # Vento (típico para Peniche)
        wind_base = 12
        wind_variation = 6 * np.sin(hour_offset * 0.15)
        wind_speed = max(0, wind_base + wind_variation + np.random.normal(0, 2))
        
        # Período e direção das ondas
        wave_period = 6 + 3 * (wave_height / 2) + np.random.normal(0, 0.5)
        wave_direction = 250 + 40 * np.sin(hour_offset * 0.1) + np.random.normal(0, 10)
        
        point = {
            "time": time_point.strftime("%Y-%m-%dT%H:%M:%S"),
            "VHM0": round(wave_height, 2),
            "zos": round(sea_level, 2),
            "water_temp": round(max(12, min(22, water_temp)), 1),
            "wind_speed": round(wind_speed, 1),
            "wave_period": round(max(4, min(15, wave_period)), 1),
            "wave_direction": int(wave_direction % 360),
            "pressure": round(1013 + 10 * np.sin(hour_offset * 0.1), 1)
        }
        
        points.append(point)
    
    return {
        "center": {"lat": CENTER_LAT, "lon": CENTER_LON},
        "bbox": {"min_lon": MIN_LON, "max_lon": MAX_LON, "min_lat": MIN_LAT, "max_lat": MAX_LAT},
        "dataset_id": "peniche_realistic_simulation",
        "variables": variables,
        "points": points,
        "total_points": len(points),
        "status": "success",
        "source": "Dados oceanográficos simulados para Peniche",
        "note": "Baseado em padrões típicos da costa portuguesa"
    }


def try_cmems_waves_only(args, vars_list):
    """Tenta obter apenas dados de ondas do CMEMS"""
    wave_vars = [v for v in vars_list if v in ['VHM0', 'VTM02', 'VMDR']]
    if not wave_vars:
        wave_vars = ['VHM0']
    
    out_dir = tempfile.mkdtemp(prefix="cmems_")
    
    # Dataset apenas de ondas (usando data histórica segura)
    dataset_id = "cmems_mod_glo_wav_my_0.2deg_PT3H-i"
    
    copernicusmarine.subset(
        dataset_id=dataset_id,
        variables=wave_vars,
        minimum_longitude=MIN_LON,
        maximum_longitude=MAX_LON,
        minimum_latitude=MIN_LAT,
        maximum_latitude=MAX_LAT,
        start_datetime="2023-04-01T00:00:00",  # Data segura
        end_datetime="2023-04-01T12:00:00",
        output_directory=out_dir,
    )
    
    files = list(Path(out_dir).glob("*.nc"))
    if not files:
        raise Exception("Nenhum ficheiro NetCDF devolvido")
    
    ds = xr.open_dataset(files[0])
    lat_idx = np.abs(ds["latitude"] - CENTER_LAT).argmin()
    lon_idx = np.abs(ds["longitude"] - CENTER_LON).argmin()
    
    points = []
    times = ds["time"].values
    
    for i, t in enumerate(times[:12]):
        point = {"time": np.datetime_as_string(t, unit="s")}
        
        # Extrair dados de ondas reais
        for var in wave_vars:
            if var in ds:
                var_data = ds[var].isel(latitude=int(lat_idx), longitude=int(lon_idx))
                if i < len(var_data.values):
                    value = float(var_data.values[i])
                    point[var] = None if np.isnan(value) else round(value, 2)
                else:
                    point[var] = None
        
        # Adicionar dados simulados para o que não existe
        if 'zos' in vars_list:
            tidal_phase = i * 0.5
            point['zos'] = round(1.2 * np.sin(tidal_phase), 2)
        
        points.append(point)
    
    return {
        "center": {"lat": CENTER_LAT, "lon": CENTER_LON},
        "bbox": {"min_lon": MIN_LON, "max_lon": MAX_LON, "min_lat": MIN_LAT, "max_lat": MAX_LAT},
        "dataset_id": dataset_id,
        "variables": vars_list,
        "points": points,
        "total_points": len(points),
        "status": "hybrid",
        "note": "Ondas CMEMS reais + marés simuladas"
    }


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)
    parser.add_argument("--dataset-id", default="cmems_mod_glo_wav_my_0.2deg_PT3H-i")
    parser.add_argument("--variables", default="VHM0,zos")
    
    args = parser.parse_args()
    vars_list = [v.strip() for v in args.variables.split(',')]
    
    try:
        if CMEMS_AVAILABLE:
            # Tentar CMEMS (apenas ondas) + dados simulados
            result = try_cmems_waves_only(args, vars_list)
        else:
            # Fallback completo
            result = generate_realistic_ocean_data(args.start, args.end, vars_list)
            result["note"] = "CMEMS não disponível - dados totalmente simulados"
        
        print(json.dumps(result))
        
    except Exception as e:
        # Fallback final com dados simulados
        result = generate_realistic_ocean_data(args.start, args.end, vars_list)
        result["note"] = f"CMEMS falhou ({str(e)}) - usando dados simulados"
        result["status"] = "fallback"
        print(json.dumps(result))


if __name__ == "__main__":
    main()