# server/cmems_timeseries.py
import argparse
import json
import sys
import tempfile
from pathlib import Path

import numpy as np
import xarray as xr

# Requer: pip install copernicusmarine xarray netcdf4
import copernicusmarine

def parse_args():
    p = argparse.ArgumentParser()
    p.add_argument("--start", required=True)
    p.add_argument("--end", required=True)
    p.add_argument("--dataset-id", required=True)
    p.add_argument("--variables", default="VHM0,zos")
    p.add_argument("--center-lat", type=float, required=True)
    p.add_argument("--center-lon", type=float, required=True)
    p.add_argument("--min-lon", type=float, required=True)
    p.add_argument("--max-lon", type=float, required=True)
    p.add_argument("--min-lat", type=float, required=True)
    p.add_argument("--max-lat", type=float, required=True)
    return p.parse_args()

def main():
    args = parse_args()
    vars_list = [v.strip() for v in args.variables.split(",") if v.strip()]
    out_dir = tempfile.mkdtemp(prefix="cmems_")

    try:
        copernicusmarine.subset(
            dataset_id=args.dataset_id,
            variables=vars_list,
            minimum_longitude=args.min_lon,
            maximum_longitude=args.max_lon,
            minimum_latitude=args.min_lat,
            maximum_latitude=args.max_lat,
            start_datetime=args.start,
            end_datetime=args.end,
            output_directory=out_dir,
        )
    except Exception as e:
        print(json.dumps({"error": f"subset falhou: {e}"}))
        sys.exit(1)

    files = list(Path(out_dir).glob("*.nc"))
    if not files:
        print(json.dumps({"error": "Sem ficheiros devolvidos"}))
        sys.exit(1)

    ds = xr.open_dataset(files)

    # Harmonizar nomes de coordenadas possíveis
    lat_name = "latitude" if "latitude" in ds.coords else ("lat" if "lat" in ds.coords else None)
    lon_name = "longitude" if "longitude" in ds.coords else ("lon" if "lon" in ds.coords else None)
    time_name = "time"

    if not lat_name or not lon_name or time_name not in ds:
        print(json.dumps({"error": "Dataset sem coordenadas esperadas"}))
        sys.exit(1)

    # encontrar índices mais próximos do centro
    lat_idx = int(np.abs(ds[lat_name] - args.center_lat).argmin())
    lon_idx = int(np.abs(ds[lon_name] - args.center_lon).argmin())

    times = ds[time_name].values
    series = {}
    for var in vars_list:
        if var not in ds:
            continue
        da = ds[var]
        # reduzir dimensões para (time)
        sel = {}
        if lat_name in da.dims:
            sel[lat_name] = lat_idx
        if lon_name in da.dims:
            sel[lon_name] = lon_idx
        if "depth" in da.dims:
            sel["depth"] = 0
        if "surface" in da.dims:
            sel["surface"] = 0
        da_pt = da.isel(**sel)
        series[var] = da_pt.values

    points = []
    for t_i, t in enumerate(times):
        rec = {"time": np.datetime_as_string(t, unit="s")}
        for var in vars_list:
            val = series.get(var)
            if val is not None and len(val) > t_i:
                v = val[t_i]
                rec[var] = None if (isinstance(v, float) and np.isnan(v)) else float(v)
        points.append(rec)

    payload = {
        "center": {"lat": args.center_lat, "lon": args.center_lon},
        "bbox": {
            "min_lon": args.min_lon, "max_lon": args.max_lon,
            "min_lat": args.min_lat, "max_lat": args.max_lat
        },
        "dataset_id": args.dataset_id,
        "variables": vars_list,
        "points": points
    }
    print(json.dumps(payload))

if __name__ == "__main__":
    main()