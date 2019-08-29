import { Controller, SlideDeck, PresenterNotes } from "./src";
import { youtubePlugin } from "./src/plugins";
import moment from "moment";

import slides from "./demo-data/slides.json"; // generated with preprocess_slides.py
import notes from "./demo-data/notes.md";
import "./demo-data/custom-style.css";

window.slides = new Controller(
    new SlideDeck(slides, [youtubePlugin]),
    document.getElementById("canvas"),
    moment.duration(30, "minutes"),
    new PresenterNotes(notes)
);
