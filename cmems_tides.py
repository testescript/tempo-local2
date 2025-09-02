# cmems_tides.py (adaptação para incluir ondas)
import json
import sys
import argparse
import tempfile
from pathlib import Path
import numpy as np
import copernicusmarine
import xarray as xr

CENTER_LAT = 39.355
CENTER_LON = -9.381
MIN_LON = -9.45
MAX_LON = -9.30
MIN_LAT = 39.34
MAX_LAT = 39.42

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start", required=True)
    parser.add_argument("--end", required=True)
    parser.add_argument("--dataset-id", default="cmems_mod_glo_wav_my_0.2deg_PT3H-i")  # Exemplo para ondas; ajuste para IBI se disponível
    parser.add_argument("--variables", default="VHM0,zos", help="Variáveis separadas por vírgula")
    args = parser.parse_args()

    out_dir = tempfile.mkdtemp(prefix="cmems_")
    vars_list = args.variables.split(',')

    copernicusmarine.subset(
        dataset_id=args.dataset_id,
        variables=vars_list,
        minimum_longitude=MIN_LON,
        maximum_longitude=MAX_LON,
        minimum_latitude=MIN_LAT,
        maximum_latitude=MAX_LAT,
        start_datetime=args.start,
        end_datetime=args.end,
        output_directory=out_dir,
    )

    files = list(Path(out_dir).glob("*.nc"))
    if not files:
        print(json.dumps({"error": "Sem ficheiros devolvidos"}))
        return

    ds = xr.open_dataset(files)
    lat_idx = np.abs(ds["latitude"] - CENTER_LAT).argmin()
    lon_idx = np.abs(ds["longitude"] - CENTER_LON).argmin()

    data = {"points": []}
    times = ds["time"].values
    for var in vars_list:
        if var not in ds: continue
        series = ds[var].isel(latitude=int(lat_idx), longitude=int(lon_idx))
        if "depth" in series.dims: series = series.isel(depth=0)
        data[var] = [float(np.nan) if np.isnan(v) else float(v) for v in series.values]

    for i, t in enumerate(times):
        point = {"time": np.datetime_as_string(t, unit="s")}
        for var in vars_list:
            if var in data: point[var] = data[var][i]
        data["points"].append(point)

    print(json.dumps({
        "center": {"lat": CENTER_LAT, "lon": CENTER_LON},
        "bbox": {"min_lon": MIN_LON, "max_lon": MAX_LON, "min_lat": MIN_LAT, "max_lat": MAX_LAT},
        "dataset_id": args.dataset_id,
        "variables": vars_list,
        "points": data["points"]
    }))

if __name__ == "__main__":
    main()
