export { default as Controller } from "./controller";
export { default as SlideDeck } from "./slidedeck";
export { default as PresenterNotes } from "./presenternotes";

import * as plug from "./plugins"
export const plugins = {
    hyperlinkPlugin: plug.hyperlinkPlugin,
    canvasPlugin: plug.canvasPlugin,
    scalePlugin: plug.scalePlugin,
    youtubePlugin: plug.youtubePlugin,
}


import "./slides.css";

