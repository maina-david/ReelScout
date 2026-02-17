const { config } = require('dotenv');
const { writeFileSync } = require('fs');
const { resolve } = require('path');

const env = process.argv[2] ?? 'development';
const envFile = env === 'development' ? '.env' : `.env.${env}`;
const root = resolve(__dirname, '..');

config({ path: resolve(root, envFile) });

const required = ['TMDB_TOKEN', 'TMDB_API_KEY'];
const missing = required.filter((key) => !process.env[key]);
if (missing.length) {
  console.error(`Missing required env vars in ${envFile}: ${missing.join(', ')}`);
  process.exit(1);
}

const isProduction = env === 'production';
const outFile = env === 'development' ? 'environment.ts' : `environment.${env}.ts`;

writeFileSync(
  resolve(root, 'src/environments', outFile),
  `export const environment = {
  production: ${isProduction},
  tmdbToken: '${process.env['TMDB_TOKEN']}',
  tmdbApiKey: '${process.env['TMDB_API_KEY']}',
  tmdbApiUrl: 'https://api.themoviedb.org/3',
  tmdbImageUrl: 'https://image.tmdb.org/t/p/',
};
`
);

console.log(`${outFile} generated from ${envFile}`);
