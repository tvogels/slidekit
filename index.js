import { Controller } from "./src/index";
import SlideDeck from "./src/slidedeck";
import PresenterNotes from "./src/presenternotes";
import moment from "moment";

import "./src/slides.css";

import slides from "./demo-data/slides.json"; // generated with preprocess_slides.py
import notes from "./demo-data/notes.md";
import "./demo-data/custom-style.css";

window.slides = new Controller(
    new SlideDeck(slides),
    document.getElementById("canvas"),
    moment.duration(30, "minutes"),
    new PresenterNotes(notes)
);
