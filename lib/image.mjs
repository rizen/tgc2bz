import sharp from 'sharp';
import { readConfig, mkdir } from './utils.mjs';

export const convertImage = async (inPath, outPath, size, mask) => {
    let image = await sharp(inPath)
        .flatten({ background: '#ffffff' })
        .toBuffer();
    image = sharp(image);
    if (mask) {
        const temp = await image.composite([{ input: mask, blend: 'dest-in' }])
            .toBuffer();
        image = sharp(temp);
    }
    const newWidth = size[0] - 75;
    const newHeight = size[1] - 75;
    await image
        .extract({ left: 37, top: 37, width: newWidth, height: newHeight })
        .resize(newWidth / 2, newHeight / 2)
        .toFile(outPath);
}

export const formatImages = async () => {
    const gameMeta = await readConfig(`./files/fromtgc/meta.json`);
    for (const set of gameMeta.sets) {
        const setIn = `./files/fromtgc/${set}`;
        const setOut = `./files/bz/src/ui/assets/${set}`;
        await mkdir(setOut);
        const setMeta = await readConfig(`${setIn}/meta.json`);
        for (const side in setMeta.sides) {
            if (setMeta.sides[side].image) {
                await convertImage(
                    `${setIn}/${setMeta.sides[side].image}`,
                    `${setOut}/${setMeta.sides[side].image}`,
                    setMeta.size,
                    setMeta.sides[side].mask ? `${setIn}/${setMeta.sides[side].mask}` : undefined
                );
            }
        }
        for (const component of setMeta.components) {
            const componentIn = `${setIn}/${component}`;
            const componentMeta = await readConfig(`${componentIn}/meta.json`);
            const componentOut = `${setOut}/${component}`;
            await mkdir(componentOut);
            for (const side in setMeta.sides) {
                if (componentMeta.sides[side].image) {
                    await convertImage(
                        `${componentIn}/${componentMeta.sides[side].image}`,
                        `${componentOut}/${componentMeta.sides[side].image}`,
                        setMeta.size,
                        setMeta.sides[side].mask ? `${setIn}/${setMeta.sides[side].mask}` : undefined
                    );
                }
            }
        }
    }
}
