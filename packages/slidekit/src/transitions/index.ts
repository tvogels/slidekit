import * as move from "./move";
import * as fadeOut from "./fadeOut";
import * as fadeIn from "./fadeIn";
import * as drawLine from "./drawLine";
import * as fadeDown from "./fadeDown";
import * as sketch from "./sketch";
import * as appearAlong from "./appearAlong";

export const enter = {
    fadeIn,
    drawLine,
    fadeDown,
    sketch,
    appearAlong,
}

export const exit = {
    move,
    fadeOut
}

export const defaultEnterTransitions = Object.values(enter);
export const defaultExitTransitions = Object.values(exit);
