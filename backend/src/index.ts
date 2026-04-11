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
    const enrichedData = liveData.map((note: any) => ({
      ...note,
      tipo_activo: metadata[note.symbol]?.tipo_activo || 'otros',
      fecha_vencimiento: metadata[note.symbol]?.fecha_vencimiento || null
    }));

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
