import SlidePlayer from "./slideplayer";
import "./cockpit.css";

export default class Cockpit {
    /**
     *
     * @param {Controller} controller
     * @param {KeyboardController} keyboardController
     * @param {PresenterNotes?} presenterNotes
     */
    constructor(controller) {
        this.controller = controller;

        this.render = this.render.bind(this);
        this.renderProgressbar = this.renderProgressbar.bind(this);
        this.scaleSVGsToFit = this.scaleSVGsToFit.bind(this);

        this.prepareWindow();

        // Current step view
        this.currentSlidePlayer = new SlidePlayer(
            this.document.getElementById("current-slide"),
            controller.deck,
            false
        );

        // Next step view
        this.nextSlidePlayer = new SlidePlayer(this.document.getElementById("next-slide"), controller.deck, false);

        // Progress bar
        this.progressBarBar = this.document.getElementById("progress-bar");
        controller.timer.addTickListener(this.renderProgressbar);
        this.window.addEventListener(
            "unload",
            controller.timer.removeTickListener.bind(controller.timer, this.renderProgressbar)
        );

        // current stage
        this.stageCanvas = this.document.getElementById("stage");

        // Presenter notes
        if (controller.presenterNotes != null) {
            this.notesDiv = this.document.getElementById("notes");
            this.currentNotes = null;
        }

        // Register a render hook for the cockpit on the controller
        controller.addRenderListener(this.render);
        this.window.addEventListener("unload", () => controller.removeRenderListener(this.render));

        // Make sure SVGs in the two cockpit canvases are shown at the right scale at all times
        setTimeout(this.scaleSVGsToFit, 1000);
        this.window.addEventListener("load", this.scaleSVGsToFit);
        this.window.addEventListener("resize", this.scaleSVGsToFit);

        // Unregister the cockpit when this window closes
        this.window.addEventListener("unload", () => (controller.cockpit = null));

        // Keyboard handler
        this.document.addEventListener("keydown", controller._keyboardHandler.bind(controller));
    }

    render(t) {
        this.currentSlidePlayer.render(t);
        this.nextSlidePlayer.render(Math.min(t + 1, this.nextSlidePlayer.stages.length - 1));
        this.stageCanvas.innerText = `${Math.floor(t)}`;
        if (this.notesDiv != null) {
            this.renderPresenterNotes(t);
        }
    }

    renderProgressbar(elapsed, percentage) {
        this.progressBarBar.style.width = `${percentage * 100}%`;
        this.progressBarBar.innerText = elapsed;
    }

    renderPresenterNotes(t) {
        const notes = this.controller.presenterNotes.getNotesForStage(t);
        if (notes !== this.currentNotes) {
            this.notesDiv.innerHTML = "";
            if (notes != null) {
                this.notesDiv.appendChild(notes);
            }
            this.currentNotes = notes;
        }
    }

    prepareWindow() {
        // The identifier 'cockpit' will give us the same window every time. It will override it.
        this.window = window.open(
            "",
            "cockpit",
            "height=720,width=1100,menubar=off,toolbar=off,titlebar=off,status=off,location=off,personalbar=off,directories=off,"
        );
        this.document = this.window.document;
        this.body = this.window.document.body;
        this.head = this.window.document.head;

        // Clear any text that is already in the window
        this.head.innerHTML = "";
        this.body.innerHTML = `
            <div class="cockpit">
                <div class="cockpit-current-wrapper">
                    <div id="current-slide"></div>
                </div>
                <div class="cockpit-next-wrapper">
                    <div id="next-slide"></div>
                </div>
                <div class="cockpit-progress-bar">
                    <div class="cockpit-progress-bar-bar" id="progress-bar"></div>
                </div>
                <div class="cockpit-notes" id="notes"></div>
                <div class="cockpit-stage" id="stage"></div>
            </div>
        `;

        // To resolve relative links to references correctly, we need to
        // add a <base> element
        const baseElem = this.document.createElement("base");
        baseElem.href = location.href;
        this.document.head.appendChild(baseElem);

        // Add any stylesheets to the child window so things look the same
        for (let stylesheet of document.getElementsByTagName("link")) {
            this.document.body.appendChild(stylesheet.cloneNode(true));
        }

        // Give it a nice name in the title bar
        this.document.title = "Cockpit";
    }

    scaleSVGsToFit() {
        const cur = this.document.getElementById("current-slide");
        const curWrapper = cur.parentElement;
        const curScale = Math.min(curWrapper.clientHeight / cur.clientHeight, curWrapper.clientWidth / cur.clientWidth);

        const next = this.document.getElementById("next-slide");
        const nextWrapper = next.parentElement;
        const nextScale = Math.min(
            nextWrapper.clientHeight / next.clientHeight,
            nextWrapper.clientWidth / next.clientWidth
        );

        cur.style.marginLeft = `${(curWrapper.clientWidth - curScale * cur.clientWidth) / 2}px`;
        cur.style.marginTop = `${(curWrapper.clientHeight - curScale * cur.clientHeight) / 2}px`;
        cur.style.transform = `scale(${curScale})`;
        next.style.marginLeft = `${(nextWrapper.clientWidth - nextScale * next.clientWidth) / 2}px`;
        next.style.marginTop = `${(nextWrapper.clientHeight - nextScale * next.clientHeight) / 2}px`;
        next.style.transform = `scale(${nextScale})`;
    }

    destroy() {
        this.window.removeEventListener("keydown", controller._keyboardHandler);
        this.window.close();
    }
}
