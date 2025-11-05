import express from 'express'; // 1. Import Express
import dotenv from 'dotenv'; // 2. Import dotenv to manage secrets

// 3. Load environment variables from .env file
dotenv.config();

const app = express(); // 4. Create your server instance
const PORT = process.env.PORT || 3000; // 5. Set the port

// 6. Define a route: "When someone visits the main URL..."
app.get('/health', (req, res) => {
  // 7. "...send this response."
  res.status(200).json({ status: 'ok', message: 'Server is running' });
});

// 8. Start the server and listen for requests
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});