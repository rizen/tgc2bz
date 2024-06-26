import React from 'react';
import { render, ProfileBadge, Space } from '@boardzilla/core';

import './style.scss';
import '@boardzilla/core/index.css';

render(setup, {
    boardSizes: (_screenX, _screenY, mobile) => mobile ? {
        name: 'mobile',
        aspectRatio: 19.5 / 9,
    } : {
        name: 'desktop',
        aspectRatio: 16 / 9.5,
    },

    settings: {
    },
    layout: (game, _player, boardSize) => {
        //game.showLayoutBoundingBoxes();
        //game.disableDefaultAppearance();

        if (boardSize === 'desktop') {


        } // end desktop
        else { // mobile



        } // end mobile



        game.layout('scoreboard', {
            area: { left: 80, top: 0, width: 20, height: 100 },
            columns: 1,
            rows: 4,
        });

        game.all('scoreboard').appearance({
            render: scoreboard => (
                <div className="scoreHeader">
                    <ProfileBadge player={scoreboard.player!} />
                    <span className="score">
                        {scoreboard.player!.score} points
                    </span>
                </div>
            )
        });

        // card sizes

        game.all('hand', { mine: false }).appearance({ render: false });

        game.layoutControls({
            element: game,
            top: 0,
            left: 0,
            width: 80,
        });

    }
});
