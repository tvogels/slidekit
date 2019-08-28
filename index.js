import { Controller } from "./src/index";
import SlideDeck from "./src/slidedeck";
import PresenterNotes from "./src/presenternotes";
import slides from "./slides.json";
import notes from "./demo-data/notes.md";
import moment from "moment";

import "./src/slides.css";

window.slides = new Controller(
    new SlideDeck(slides),
    document.getElementById("canvas"),
    moment.duration(30, "minutes"),
    new PresenterNotes(notes)
);
