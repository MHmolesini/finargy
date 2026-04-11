import express, { Request, Response } from 'express';
import axios from 'axios';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Endpoint base para verificar que el backend funciona
app.get('/', (req: Request, res: Response) => {
  res.send('Backend de Finanzas Arg Funcionando 🚀');
});

// Endpoint de proxy para arg_notes
app.get('/api/notes', async (req: Request, res: Response) => {
  try {
    const response = await axios.get('https://data912.com/live/arg_notes');
    res.json(response.data);
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
