#!/usr/bin/env -S node --env-file=.env
import { downloadGame } from './lib/tgc.mjs';
import { formatImages } from './lib/image.mjs';
import { generateCode } from './lib/codegen.mjs';
const tgcGameId = 'F86189F6-DFBE-11EE-B26F-9058557DD696';

//await downloadGame(tgcGameId);

//await formatImages();

await generateCode();