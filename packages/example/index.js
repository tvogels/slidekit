import { Controller, SlideDeck, PresenterNotes, plugins } from "slidekit";
import moment from "moment";

import slides from "slides/*.svg";
import notes from "./presenter-notes.md";
import bouncyAnimation from "./bouncyAnimation";

document.title = "SlideKit Example";  // title bar

const slideList = Object.entries(slides).map(([key, value]) => ({ id: key, content: value }));

const controller = new Controller(
    new SlideDeck(slideList, [plugins.youtubePlugin, plugins.hyperlinkPlugin, plugins.canvasPlugin]),
    document.getElementById("main-screen"),
    {
        duration: moment.duration(30, "minutes"),
        notes: new PresenterNotes(notes),
        scripts: {
            bouncy: bouncyAnimation
        }
    }
);
