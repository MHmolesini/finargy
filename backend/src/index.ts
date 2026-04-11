import express, { Request, Response } from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Ruta al archivo de metadatos
const METADATA_PATH = path.join(__dirname, 'data', 'symbols_metadata.json');

// Función para obtener metadatos actualizados
const getMetadata = () => {
    try {
        if (fs.existsSync(METADATA_PATH)) {
            const fileContent = fs.readFileSync(METADATA_PATH, 'utf-8');
            return JSON.parse(fileContent);
        }
    } catch (error) {
        console.error('Error leyendo metadatos:', error);
    }
    return {};
};

// Endpoint base para verificar que el backend funciona
app.get('/', (req: Request, res: Response) => {
  res.send('Backend de Finanzas Arg Funcionando 🚀');
});

// Endpoint de proxy para arg_notes enriquecido
app.get('/api/notes', async (req: Request, res: Response) => {
  try {
    const response = await axios.get('https://data912.com/live/arg_notes');
    const liveData = response.data;
    const metadata = getMetadata();

    // Enriquecer datos
    const enrichedData = liveData.map((note: any) => {
      const meta = metadata[note.symbol];
      let precio_final_estimado = null;

      if (meta?.fecha_emision && meta?.fecha_vencimiento && meta?.tasa_licitacion) {
        const emision = new Date(meta.fecha_emision);
        const vencimiento = new Date(meta.fecha_vencimiento);
        emision.setHours(0,0,0,0);
        vencimiento.setHours(0,0,0,0);
        
        const diffTime = vencimiento.getTime() - emision.getTime();
        const diasReales = Math.round(diffTime / (1000 * 60 * 60 * 24));
        
        // T+1: Calculamos al día previo al vencimiento real
        const diasCalc = Math.max(0, diasReales - 1);
        precio_final_estimado = 100 * Math.pow((1 + meta.tasa_licitacion), diasCalc / 30.0);
      }

      return {
        ...note,
        tipo_activo: meta?.tipo_activo || 'otros',
        fecha_vencimiento: meta?.fecha_vencimiento || null,
        precio_final_estimado: precio_final_estimado
      };
    });

    res.json(enrichedData);
  } catch (error) {
    console.error('Error fetching data from data912:', error);
    res.status(500).json({ error: 'Error al obtener datos de la API externa' });
  }
});

// Futuro: Endpoint para otros tipos de activos
app.get('/api/stocks', async (req: Request, res: Response) => {
    try {
      const response = await axios.get('https://data912.com/live/arg_stocks');
      res.json(response.data);
    } catch (error) {
      res.status(500).json({ error: 'Error al obtener datos de stocks' });
    }
});

app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
