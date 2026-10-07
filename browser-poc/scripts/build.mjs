import { build } from 'esbuild';
import { mkdir, copyFile } from 'node:fs/promises';
await mkdir('dist', {recursive:true});
await build({entryPoints:['src/main.ts','src/worker.ts'],outdir:'dist',bundle:true,format:'esm',target:'es2022',minify:true});
for (const name of ['index.html','style.css']) await copyFile(name, 'dist/'+name);
await mkdir('tests/generated', {recursive:true});
await build({entryPoints:['src/core.ts','src/codec.ts','src/state.ts','src/capabilities.ts','src/errors.ts','src/engine.ts'],outdir:'tests/generated',bundle:true,format:'esm',splitting:true,platform:'node',target:'node22'});
