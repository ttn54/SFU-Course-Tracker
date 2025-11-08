import express from 'express';
import cors from 'cors'; // Import cors
import dotenv from 'dotenv';
import authRoutes from './routes/authRoutes'; // Import our new routes

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors()); // Use cors
app.use(express.json()); // Use the built-in JSON parser

// Routes
app.use('/auth', authRoutes); // Use our auth routes

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// 404 handler (must be after all routes)
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});