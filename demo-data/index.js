import { Controller, SlideDeck, PresenterNotes } from "../src";
import { youtubePlugin } from "../src/plugins";
import moment from "moment";

import slides from "./slides.json"; // generated with preprocess_slides.py
import notes from "./notes.md";
import "./custom-style.css";

window.slides = new Controller(
    new SlideDeck(slides, [youtubePlugin]),
    document.getElementById("main-screen"),
    moment.duration(30, "minutes"),
    new PresenterNotes(notes)
);
