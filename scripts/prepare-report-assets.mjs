import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const destination = join(root, 'public', 'report-assets');
await rm(destination, { recursive: true, force: true });
await mkdir(join(destination, 'lang-data'), { recursive: true });
await cp(join(root, 'node_modules/tesseract.js/dist/worker.min.js'), join(destination, 'worker.min.js'));
await cp(join(root, 'node_modules/tesseract.js-core/tesseract-core-lstm.wasm.js'), join(destination, 'tesseract-core.wasm.js'));
await cp(join(root, 'node_modules/tesseract.js-core/tesseract-core-lstm.wasm'), join(destination, 'tesseract-core.wasm'));
await cp(join(root, 'node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs'), join(destination, 'pdf.worker.min.mjs'));
await cp(join(root, 'node_modules/@tesseract.js-data/eng/4.0.0/eng.traineddata.gz'), join(destination, 'lang-data', 'eng.traineddata.gz'));
await cp(join(root, 'node_modules/@tesseract.js-data/chi_tra/4.0.0/chi_tra.traineddata.gz'), join(destination, 'lang-data', 'chi_tra.traineddata.gz'));
console.log('Prepared same-origin report extraction assets');
