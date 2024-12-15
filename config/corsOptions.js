const cors = require('cors');

const corsOptions = {
  origin: 'http://localhost:5173', // URL de votre frontend
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

module.exports = cors(corsOptions);