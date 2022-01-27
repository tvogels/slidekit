import { Controller, SlideDeck, PresenterNotes, domPlugins } from "slidekit";
import moment from "moment";

import slides from "./tests.sketch";
import notes from "./presenter-notes.md";
import bouncyAnimation from "./bouncyAnimation";

document.title = "SlideKit Example";  // title bar

const slideList = Object.entries(slides).map(([key, value]) => ({ id: key, content: value }));
slideList.sort((a, b) => a.id - b.id);

const controller = new Controller(
    slideList,
    document.getElementById("main-screen"),
    {
        duration: moment.duration(30, "minutes"),
        notes: new PresenterNotes(notes),
        domPlugins: [domPlugins.youtube, domPlugins.hyperlink, domPlugins.canvas],
        scripts: {
            bouncy: bouncyAnimation
        }
    }
);
