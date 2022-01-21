import { Controller, SlideDeck, PresenterNotes, plugins } from "svgslides";
import moment from "moment";

import slides from "./*.svg";
import notes from "./presenter-notes.md";

const slideList = Object.entries(slides).map(([key, value]) => ({ id: key, content: value}));

window.slides = new Controller(
    new SlideDeck(slideList, [plugins.youtubePlugin, plugins.hyperlinkPlugin]),
    document.getElementById("main-screen"),
    moment.duration(30, "minutes"),
    new PresenterNotes(notes)
);
