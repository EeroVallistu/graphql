const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Load English API specification
const englishSpec = YAML.load(path.join(__dirname, '../docs/en/api.yaml'));

// Base SwaggerUI options
const baseOptions = {
  explorer: true
};

// Configuration options for English documentation
const englishOptions = {
  ...baseOptions,
  customSiteTitle: "API Documentation (English)",
  swaggerOptions: {
    url: null, // Use direct spec object
    defaultModelsExpandDepth: 1,
    docExpansion: 'list'
  }
};

// Serve swagger-ui assets
router.use(swaggerUi.serve);

// Simple handler for English documentation
router.get('/', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(swaggerUi.generateHTML(englishSpec, englishOptions));
});

// Asset handler for Swagger UI resources
router.get('/:filename', (req, res, next) => {
  // Let express handle asset requests
  next();
});

module.exports = router;
