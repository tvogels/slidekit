import { Controller, PresenterNotes } from "slidekit";
import moment from "moment";

import slides from "./highlight.sketch";
import notes from "./presenter-notes.md";
import moleculeScript from "./molecule";

document.title = "SlideKit"; // title bar

const controller = new Controller(
    Object.entries(slides)
        .map(([key, value]) => ({ id: key, content: value }))
        .sort((a, b) => a.id - b.id),
    document.getElementById("main-screen"),
    {
        duration: moment.duration(30, "minutes"),
        notes: new PresenterNotes(notes),
        scripts: {
            molecule: moleculeScript,
        },
    }
);

window.slidekit = controller;
