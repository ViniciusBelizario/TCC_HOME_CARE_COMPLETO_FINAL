const path = require('path');
const fs = require('fs');
const YAML = require('yamljs');

const openapiPath = path.join(__dirname, 'openapi.yaml');

let openapiDoc;
if (fs.existsSync(openapiPath)) {
  openapiDoc = YAML.load(openapiPath);
} else {
  console.warn('[Swagger] openapi.yaml não encontrado em', openapiPath);
  openapiDoc = { openapi: '3.0.3', info: { title: 'TCC HomeCare API', version: '1.0.0' }, paths: {} };
}

module.exports = { openapiDoc };
