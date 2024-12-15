const cors = require('cors');

const corsOptions = {
  origin: 'https://frontend-2y3c1rmeo-cesonus-projects.vercel.app', // URL de votre frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

module.exports = cors(corsOptions);