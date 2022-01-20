import { Controller, SlideDeck, PresenterNotes } from "svgslides";
import { youtubePlugin } from "svgslides";
import moment from "moment";

import slides from "./slides.json"; // generated with preprocess_slides.py
import notes from "./presenter-notes.md";

window.slides = new Controller(
    new SlideDeck(slides, []),
    document.getElementById("main-screen"),
    moment.duration(30, "minutes"),
    new PresenterNotes(notes)
);
