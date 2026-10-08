// Escribe src/app/utils/version.utils.ts con la versión de package.json y la fecha de compilación (corre antes de cada build)
import { readFileSync, writeFileSync } from 'node:fs';

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const now = new Date();
const pad = (value) => String(value).padStart(2, '0');
const built = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}`;
writeFileSync(
    new URL('../src/app/utils/version.utils.ts', import.meta.url),
    [
        '// Generado por tools/write-version.mjs antes de cada build: no lo edites a mano',
        '',
        '/** Versión de la app, copiada de package.json */',
        `export const APP_VERSION = '${pkg.version}';`,
        '/** Fecha y hora local de la compilación (AAAA-MM-DD HH:mm) */',
        `export const APP_BUILT = '${built}';`,
        '',
    ].join('\n'),
);
console.log(`version ${pkg.version} (${built})`);
