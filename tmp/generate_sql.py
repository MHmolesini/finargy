import json
import os

# Rutas de los archivos
base_path = r'c:\Users\matia\OneDrive\Escritorio\github_proyectos\finanzas_arg\backend\src\data'
files = {
    'symbols': 'symbols_metadata.json',
    'stocks': 'stocks_metadata.json',
    'cedears': 'cedears_metadata.json'
}

# Consolidado
all_metadata = {}

# 1. Cargar Symbols (Bonos/Lecaps)
try:
    with open(os.path.join(base_path, files['symbols']), 'r', encoding='utf-8') as f:
        symbols = json.load(f)
        for sym, data in symbols.items():
            all_metadata[sym] = {
                'tipo_activo': data.get('tipo_activo'),
                'sector': None,
                'industria': None,
                'fecha_vencimiento': data.get('fecha_vencimiento'),
                'fecha_emision': data.get('fecha_emision'),
                'tasa_licitacion': data.get('tasa_licitacion')
            }
except Exception as e:
    print(f"Error cargando symbols: {e}")

# 2. Cargar Stocks
try:
    with open(os.path.join(base_path, files['stocks']), 'r', encoding='utf-8') as f:
        stocks = json.load(f)
        for sym, data in stocks.items():
            if sym not in all_metadata:
                all_metadata[sym] = {'fecha_vencimiento': None, 'fecha_emision': None, 'tasa_licitacion': None}
            all_metadata[sym].update({
                'tipo_activo': data.get('tipo_activo', 'acciones'),
                'sector': data.get('sector'),
                'industria': data.get('industria')
            })
except Exception as e:
    print(f"Error cargando stocks: {e}")

# 3. Cargar Cedears
try:
    with open(os.path.join(base_path, files['cedears']), 'r', encoding='utf-8') as f:
        cedears = json.load(f)
        for sym, data in cedears.items():
            if sym not in all_metadata:
                all_metadata[sym] = {'fecha_vencimiento': None, 'fecha_emision': None, 'tasa_licitacion': None}
            all_metadata[sym].update({
                'tipo_activo': data.get('tipo_activo', 'acciones'),
                'sector': data.get('sector'),
                'industria': data.get('industria')
            })
except Exception as e:
    print(f"Error cargando cedears: {e}")

# Generar SQL
sql = """-- 1. Crear la tabla unificada
CREATE TABLE assets_metadata (
  symbol TEXT PRIMARY KEY,
  tipo_activo TEXT,
  sector TEXT,
  industria TEXT,
  fecha_vencimiento DATE,
  fecha_emision DATE,
  tasa_licitacion FLOAT8
);

-- 2. Insertar los datos
INSERT INTO assets_metadata 
  (symbol, tipo_activo, sector, industria, fecha_vencimiento, fecha_emision, tasa_licitacion)
VALUES
"""

values_list = []
for sym, d in all_metadata.items():
    # Formatear valores nulos para SQL
    tipo_val = "'" + d['tipo_activo'] + "'" if d['tipo_activo'] else "NULL"
    sector_val = "'" + d['sector'].replace("'", "''") + "'" if d['sector'] else "NULL"
    industria_val = "'" + d['industria'].replace("'", "''") + "'" if d['industria'] else "NULL"
    vencimiento_val = "'" + d['fecha_vencimiento'] + "'" if d['fecha_vencimiento'] else "NULL"
    emision_val = "'" + d['fecha_emision'] + "'" if d['fecha_emision'] else "NULL"
    tasa_val = str(d['tasa_licitacion']) if d['tasa_licitacion'] is not None else "NULL"
    
    values_list.append(f"  ('{sym}', {tipo_val}, {sector_val}, {industria_val}, {vencimiento_val}, {emision_val}, {tasa_val})")

sql += ",\n".join(values_list) + ";"

# Guardar SQL en tmp
with open(r'c:\Users\matia\OneDrive\Escritorio\github_proyectos\finanzas_arg\tmp\setup_supabase.sql', 'w', encoding='utf-8') as f:
    f.write(sql)

print(f"SQL generado exitosamente en tmp\setup_supabase.sql. Total de registros: {len(all_metadata)}")
