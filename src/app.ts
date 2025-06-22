import express from 'express';
import bookRouter from './routes/bookRoutes';
import { createGenericError } from './utils/utils';

const app = express();
app.use(express.json());

app.get('/', async (req, res) => {
  res.status(200).json({
    message: 'library management server is running',
  });
});

app.use('/api', bookRouter);

export default app;
