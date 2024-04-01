import axios from 'axios';
import { downloadFile, writeConfig, sanitize, mkdir } from './utils.mjs';

export const rest = async (slug, config = {}) => {
    const response = await axios(`https://www.thegamecrafter.com${slug}`, config);
    if (response.data.error)
        throw new Error(response.data.error.message);
    return response.data.result;
}

export const getAll = async (slug, config = {}, iterations = 1) => {
    if (iterations > 199)
        throw new Error(`Too many iterations fetching all ${slug}`);
    const list = [];
    const result = await rest(slug, config);
    list.push(...result.items);
    if (parseInt(result.paging.page_number) < parseInt(result.paging.total_page)) {
        list.push(...(await getAll(slug, { ...config, _page_number: parseInt(config._page_number) + 1 }, iterations + 1)));
    }
    return list;
}

export const getAdminSession = async () => {
    return await rest('/api/session', {
        method: 'POST',
        data: {
            username: process.env.TGC_USERNAME,
            password: process.env.TGC_PASSWORD,
            api_key_id: process.env.TGC_PUBLIC_KEY,
        },
    })
}

export const downloadGame = async (gameId) => {
    const session = await getAdminSession();
    const game = await rest('/api/game/F86189F6-DFBE-11EE-B26F-9058557DD696');
    const gameMeta = {
        id: game.id,
        name: game.name,
        sets: [],
    };
    const componentsList = await getAll('/api/game/F86189F6-DFBE-11EE-B26F-9058557DD696/components-overview');
    for (const component of componentsList) {
        console.log(component.name);
        if (component.object_class == 'Deck') {
            const name = sanitize(component.name);
            await downloadDeck(session.id, component.id, name);
            gameMeta.sets.push(name);
        }
    }
    await writeConfig(`./files/fromtgc/meta.json`, gameMeta);
}

export const downloadDeck = async (sessionId, deckId, deckName) => {
    const deck = await rest(`/api/deck/${deckId}?session_id=${sessionId}`);
    const deckOut = `./files/fromtgc/${deckName}`;
    await mkdir(deckOut);
    //console.log(deck);
    const back = await rest(`/api/file/${deck.back_id}?session_id=${sessionId}`);
    const product = await rest(`/api/tgc/products/${deck.identity}`);
    const deckMeta = {
        name: deck.name,
        id: deck.id,
        quantity: deck.quantity,
        identity: deck.identity,
        components: [],
        sides: {},
        size: product.size.split('x'),
    };
    for (const side of product.sides) {
        deckMeta.sides[side.field] = {};
        const filename = `${side.field}_mask.png`;
        deckMeta.sides[side.field].mask = filename;
        await downloadFile(`https://www.thegamecrafter.com${side.mask}`, `${deckOut}/${filename}`);
    }
    const backImageFilename = `back.${back.file_type.toLowerCase()}`;
    deckMeta.sides.back.image = backImageFilename;
    await downloadFile(`https:${back.file_uri}`, `${deckOut}/${backImageFilename}`);
    const cards = await getAll(`/api/deck/${deckId}/cards?session_id=${sessionId}`);
    for (const card of cards) {
        const cardName = sanitize(card.name);
        deckMeta.components.push(cardName);
        const cardOut = `${deckOut}/${cardName}`;
        await mkdir(cardOut);
        //console.log(card);
        const cardMeta = {
            name: card.name,
            id: card.id,
            quantity: card.quantity,
            sides: {},
        };
        for (const side of product.sides) {
            cardMeta.sides[side.field] = {};
        }
        const face = await rest(`/api/file/${card.face_id}?session_id=${sessionId}`);
        const faceImageFilename = `face.${face.file_type.toLowerCase()}`;
        cardMeta.sides.face.image = faceImageFilename;
        await downloadFile(`https:${face.file_uri}`, `${cardOut}/${faceImageFilename}`);
        if (card.back_from == 'Card') {
            const back = await rest(`/api/file/${card.back_id}?session_id=${sessionId}`);
            const backImageFilename = `back.${back.file_type.toLowerCase()}`;
            cardMeta.sides.back.image = backImageFilename;
            await downloadFile(`https:${back.file_uri}`, `${cardOut}/${backImageFilename}`);
        }
        await writeConfig(`${cardOut}/meta.json`, cardMeta);
        // break;
    }
    await writeConfig(`${deckOut}/meta.json`, deckMeta);
}

