import fs from 'fs';
import { readConfig, mkdir } from './utils.mjs';
import { getContext, toFile, after, inject } from '@featherscloud/pinion';
import { camelCase, pascalCase } from 'scule';

export const generateCode = async () => {
    const gameMeta = await readConfig(`./files/fromtgc/meta.json`);
    const gamePascal = pascalCase(gameMeta.name.replace(/ /g, ''));
    const uiOut = `./files/bz/src/ui`;
    const gameOut = `./files/bz/src/game`;
    await init(uiOut, gameOut);
    await subclassPlayer({ gameOut, gamePascal });
    await subclassGame({ gameOut, gamePascal });
    await subclassPieceAsCard({ gameOut, gamePascal });
    await createGame({ gameOut, gamePascal });
    for (const set of gameMeta.sets) {
        const setIn = `./files/fromtgc/${set}`;
        const setMeta = await readConfig(`${setIn}/meta.json`);
        const setPascal = pascalCase(set);
        const setCamel = camelCase(set) + 's';
        const setPropsFile = `${gameOut}/${setPascal}.ts`;
        await fs.promises.copyFile(`./templates/game/cards.ts`, setPropsFile);
        await exportCards({ gameOut, setCamel, setPropsFile })
        await importCards({ gameOut, setCamel, setPascal });
        await createCards({ gameOut, setCamel });
        for (const component of setMeta.components) {
            const componentIn = `${setIn}/${component}`;
            const componentMeta = await readConfig(`${componentIn}/meta.json`);
            for (const side in setMeta.sides) {
                if (componentMeta.sides[side].image && side == 'face') {
                    await addCardProps({ ...componentMeta, setPropsFile });
                    await addCardFace({ uiOut, name: componentMeta.name, url: `./assets/${set}/${component}/${componentMeta.sides[side].image}` });
                }
            }
        }
    }
}

export const createCards = (params) => {
    return Promise.resolve(getContext({})).then(inject(`
    for (const card of ${params.setCamel}) {
        $.drawPile.createMany(card.quantity!, Card, card.name!, card);
    }`,
        after('//create components'), toFile(`./${params.gameOut}/index.ts`)));
}

export const createGame = (params) => {
    return Promise.resolve(getContext({})).then(inject(`
export default createGame(${params.gamePascal}Player, ${params.gamePascal}Game, game => {

    const { action } = game;
    const { playerActions, loop, eachPlayer, everyPlayer, whileLoop, forLoop } = game.flowCommands;

    //setup
    game.create(Space, 'drawPile');
    $.drawPile.onEnter(Card, t => t.hideFromAll());

    //create components

    game.create(Space, 'discardPile');
    $.discardPile.onEnter(Card, t => t.showToAll());

    for (const player of game.players) {
        const hand = game.create(Space, 'hand', { player });
        hand.onEnter(Card, c => {
            c.showOnlyTo(player.position);
            hand.sortBy('name');
        });
        game.create(Space, 'scoreboard', { player });
    }

    // actions
    game.defineActions({
        drawCard: player => action({ prompt: 'Draw a card' })
            .chooseOnBoard('card', $.drawPile.all(Card))
            .move('card', player.my('hand')!),
        draw2Cards: player => action({ prompt: 'Draw 2 cards' })
            .chooseOnBoard('cards', $.drawPile.all(Card), {
                number: 2,
            })
            .move('cards', player.my('hand')!),
        discardCard: player => action({ prompt: 'Discard a card' })
            .chooseOnBoard('card', player.my('hand')!.all(Card))
            .move('card', $.discard!),
        discard3Cards: player => action({ prompt: 'Choose 3 cards to discard' })
            .chooseOnBoard('cards', player.my('hand')!.all(Card), {
                number: 3,
                confirm: 'Are you sure these are the 3 you want to discard?',
            })
            .move('cards', $.discard!),
    });

    // utility functions
    const determineWinner = () => {
        let highestPlayer: ${params.gamePascal}Player | undefined = undefined;
        let highestScore = 0;
        for (const player of game.players) {
            if (player.score > highestScore) {
                highestPlayer = player;
                highestScore = player.score;
            }
            else if (player.score == highestScore) {
                highestPlayer = undefined;
            }
        }
        game.finish(highestPlayer);
    }

    // flow
    game.defineFlow(
        () => {
            $.drawPile.shuffle();
        },
        whileLoop({
            while: () => game.round <= 5,
            do: [
                everyPlayer({
                    do: playerActions({ actions: ['drawCard','discardCard'] })
                }),
                () => {
                    game.round++;
                }
            ]
        }),
        () => {
            determineWinner();
        },
    ); // end flow

});`,
        after('// Create Game'), toFile(`./${params.gameOut}/index.ts`)));
}

export const subclassPieceAsCard = (params) => {
    return Promise.resolve(getContext({})).then(inject(`
export class Card extends Piece<${params.gamePascal}Game> {
    quantity: number
}`,
        after('// Subclasses'), toFile(`./${params.gameOut}/index.ts`)));
}

export const subclassGame = (params) => {
    return Promise.resolve(getContext({})).then(inject(`
export class ${params.gamePascal}Game extends Game<${params.gamePascal}Game, ${params.gamePascal}Player> {
    round = 1;
}`,
        after('// Subclasses'), toFile(`./${params.gameOut}/index.ts`)));
}

export const subclassPlayer = (params) => {
    return Promise.resolve(getContext({})).then(inject(`
export class ${params.gamePascal}Player extends Player<${params.gamePascal}Game> {
    score = 0;
};`,
        after('// Subclasses'), toFile(`./${params.gameOut}/index.ts`)));
}

export const exportCards = (params) => {
    return Promise.resolve(getContext({})).then(inject(`
export const ${params.setCamel}: Partial<Card> [] = [`,
        after('from "./index.js"'), toFile(params.setPropsFile)));
}

export const importCards = (params) => {
    return Promise.resolve(getContext({})).then(inject(`import { ${params.setCamel} } from './${params.setPascal}.js';`,
        after('from \'@boardzilla/core\';'), toFile(`./${params.gameOut}/index.ts`)));
}

export const addCardProps = (params) => {
    return Promise.resolve(getContext({})).then(inject(`
        {
            name : "${params.name}",
            quantity : ${params.quantity},
        },`, after('Partial<Card> [] = ['), toFile(params.setPropsFile)));
}

export const addCardFace = (params) => {
    return Promise.resolve(getContext({})).then(inject(`
        &[data-name="${params.name}"] {
            background-image: url("${params.url}");
        }`, after('// Card Faces'), toFile(`${params.uiOut}/index.scss`)));
}

export const init = async (uiOut, gameOut) => {
    await mkdir(gameOut);
    await fs.promises.copyFile(`./templates/ui/index.scss`, `${uiOut}/index.scss`);
    await fs.promises.copyFile(`./templates/game/index.ts`, `${gameOut}/index.ts`);
    await fs.promises.copyFile(`./templates/ui/index.tsx`, `${uiOut}/index.tsx`);
}
