import { Controller, PresenterNotes, preprocessors } from "slidekit";
import moment from "moment";

import slides from "./highlight.sketch";
import notes from "./presenter-notes.md";
import bouncyAnimation from "./bouncyAnimation";

document.title = "SlideKit Example";  // title bar

const slideList = Object.entries(slides).map(([key, value]) => ({ id: key, content: value })).sort((a, b) => a.id - b.id);;


const controller = new Controller(
    slideList,
    document.getElementById("main-screen"),
    {
        duration: moment.duration(30, "minutes"),
        notes: new PresenterNotes(notes),
        preprocessors: [preprocessors.youtube, preprocessors.hyperlink, preprocessors.canvas, preprocessors.video],
        scripts: {
            bouncy: bouncyAnimation,
            bla: () => ({
                tick(t) {
                    this.node.style.opacity = Math.sin(t * Math.PI);
                },
                setNode(node) {
                    this.node = node;
                    node.style.opacity = 0;
                },
                duration(t) {
                    return .5;
                }
            })
        }
    }
);

window.slidekit = controller;