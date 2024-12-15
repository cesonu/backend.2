const cors = require('cors');

const corsOptions = {
  origin: ['https://frontend-57a179gk2-cesonus-projects.vercel.app', 'https://frontend-2y3c1rmeo-cesonus-projects.vercel.app', 'http://localhost:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

module.exports = cors(corsOptions);