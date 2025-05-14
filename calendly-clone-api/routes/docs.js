const express = require('express');
const router = express.Router();
const swaggerUi = require('swagger-ui-express');
const YAML = require('yamljs');
const path = require('path');

// Load both language versions and main API spec
const englishSpec = YAML.load(path.join(__dirname, '../docs/en/api.yaml'));
const estonianSpec = YAML.load(path.join(__dirname, '../docs/et/api.yaml'));
const mainSpec = YAML.load(path.join(__dirname, '../calendly-clone-api.yaml'));

// Base SwaggerUI options
const baseOptions = {
  explorer: true
};

// Language-specific options
const englishOptions = {
  ...baseOptions,
  customSiteTitle: "API Documentation (English)",
  swaggerOptions: {
    url: null, // Use direct spec object
    defaultModelsExpandDepth: 1,
    docExpansion: 'list'
  }
};

const estonianOptions = {
  ...baseOptions,
  customSiteTitle: "API Dokumentatsioon (Eesti)",
  swaggerOptions: {
    url: null, // Use direct spec object
    defaultModelsExpandDepth: 1,
    docExpansion: 'list'
  }
};

const mainOptions = {
  ...baseOptions,
  customSiteTitle: "Calendly Clone API Documentation",
  swaggerOptions: {
    url: null,
    defaultModelsExpandDepth: 1,
    docExpansion: 'list'
  }
};

// Serve swagger-ui assets
router.use(swaggerUi.serve);

// Specific handlers for each language path
router.get('/', (req, res) => {
  // Determine which documentation to serve based on the current route path
  const routePath = req.baseUrl || '';
  
  if (routePath === '/en') {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(swaggerUi.generateHTML(englishSpec, englishOptions));
  } 
  else if (routePath === '/et') {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(swaggerUi.generateHTML(estonianSpec, estonianOptions));
  }
  else if (routePath === '/docs') {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return res.send(swaggerUi.generateHTML(mainSpec, mainOptions));
  }
  
  // Default to English for any other path
  res.setHeader('Cache-Control', 'public, max-age=300');
  res.send(swaggerUi.generateHTML(englishSpec, englishOptions));
});

// Catch-all for Swagger UI internal routes
router.get('/*', (req, res, next) => {
  // Pass through for asset requests
  if (req.url.match(/\.(js|css|png|jpg|jpeg|gif|ico)$/)) {
    return next();
  }
  // Otherwise redirect to the root of the current path
  res.redirect(req.baseUrl || '/');
});

module.exports = router;
