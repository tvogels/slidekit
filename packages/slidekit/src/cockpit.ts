import SlidePlayer from "./slideplayer";
import { copyToClipboard } from "./utils";
import Controller, { Canvas } from "./controller";
import "./cockpit.css";

export default class Cockpit {
    window: Window;

    private controller: Controller;
    private currentSlidePlayer: SlidePlayer;
    private nextSlidePlayer: SlidePlayer;
    private document: Document;
    private progressBarBar: HTMLDivElement;
    private stageCanvas: HTMLDivElement;
    private notesDiv: HTMLDivElement;
    private currentNotes?: HTMLDivElement;
    private body: HTMLBodyElement;
    private head: HTMLHeadElement;
    private visibilityListener: any;

    constructor(controller: Controller) {
        this.controller = controller;

        this.render = this.render.bind(this);
        this.renderProgressbar = this.renderProgressbar.bind(this);
        this.scaleSVGsToFit = this.scaleSVGsToFit.bind(this);

        this.prepareWindow();

        // Current step view
        this.currentSlidePlayer = new SlidePlayer(
            new Canvas(
                this.document.getElementById("current-slide") as HTMLDivElement,
                this.controller.deck.width,
                this.controller.deck.height
            ),
            controller.deck,
            null
        );

        // Next step view
        this.nextSlidePlayer = new SlidePlayer(
            new Canvas(
                this.document.getElementById("next-slide") as HTMLDivElement,
                this.controller.deck.width,
                this.controller.deck.height
            ),
            controller.deck,
            null
        );

        // Progress bar
        this.progressBarBar = this.document.getElementById("progress-bar") as HTMLDivElement;
        controller.timer.addTickListener(this.renderProgressbar);
        this.window.addEventListener(
            "unload",
            controller.timer.removeTickListener.bind(controller.timer, this.renderProgressbar)
        );

        // current stage
        this.stageCanvas = this.document.getElementById("stage") as HTMLDivElement;
        this.stageCanvas.addEventListener("click", () => {
            copyToClipboard(this.document, this.stageCanvas.innerHTML);
        });

        // Presenter notes
        if (controller.presenterNotes != null) {
            this.notesDiv = this.document.getElementById("notes") as HTMLDivElement;
            this.currentNotes = null;
        }



        // Register a render hook for the cockpit on the controller
        controller.addRenderListener(this.render);
        this.window.addEventListener("unload", () => controller.removeRenderListener(this.render));

        // Make sure SVGs in the two cockpit canvases are shown at the right scale at all times
        setTimeout(this.scaleSVGsToFit, 10);
        setTimeout(this.scaleSVGsToFit, 100);
        setTimeout(this.scaleSVGsToFit, 500);
        setTimeout(this.scaleSVGsToFit, 1000);
        this.window.addEventListener("resize", this.scaleSVGsToFit);

        // Unregister the cockpit when this window closes
        this.window.addEventListener("unload", () => (controller.cockpit = null));

        // Keyboard handler
        this.document.addEventListener("keydown", controller.keyboardHandler);
    }

    render(t) {
        this.currentSlidePlayer.render(t);
        this.nextSlidePlayer.render(Math.min(t + 1, this.nextSlidePlayer.stages.length - 1));
        if (this.notesDiv != null) {
            this.renderPresenterNotes(t);
        }
        this.renderStageId(t);
    }

    renderStageId(t) {
        const id = `# ${this.controller.deck.stageId(t)}`;
        if (this.stageCanvas.innerHTML !== id) {
            this.stageCanvas.innerHTML = id;
        }
    }

    renderProgressbar(elapsed, percentage) {
        this.progressBarBar.style.width = `${percentage * 100}%`;
        this.progressBarBar.innerText = elapsed;
    }

    renderPresenterNotes(t) {
        const stageId = this.controller.deck.stageId(t);
        const slideId = this.controller.deck.slideId(t);
        const notes = this.controller.presenterNotes.getNote(slideId, stageId);
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
        this.body = this.window.document.body as HTMLBodyElement;
        this.head = this.window.document.head;

        // Clear any text that is already in the window
        this.head.innerHTML = `
            <style>
                html, body { 
                    height: 100%; 
                }
                body {
                    margin: 0;
                    padding: 0;
                    background-color: #ccc;
                    overflow: hidden;
                    font-family: sans-serif;
                }
                @media (prefers-color-scheme: dark) {
                    body { background-color: rgb(40, 39,36); }
                }
            </style>
        `;
        this.body.innerHTML = `
            <div class="slides-cockpit">
                <div class="slides-cockpit-current-wrapper" id="current-slide">
                </div>
                <div class="slides-cockpit-next-wrapper" id="next-slide">
                </div>
                <div class="slides-cockpit-progress-bar">
                    <div class="slides-cockpit-progress-bar-bar" id="progress-bar"></div>
                </div>
                <div class="slides-cockpit-notes" id="notes"></div>
                <div class="slides-cockpit-stage" id="stage" title="Copy to clipboard"></div>
            </div>
            <div class="slides-main-window-invisible">
                Please make sure that the main window is visible on screen.
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

        this.visibilityListener = (e) => {
            const node = this.document.querySelector(".slides-main-window-invisible") as HTMLElement;
            node.style.display = document.visibilityState === "visible" ? "none" : "block";
        };
        document.addEventListener('visibilitychange', this.visibilityListener);

    }

    scaleSVGsToFit() {
        this.currentSlidePlayer.canvas.resizeHandler();
        this.nextSlidePlayer.canvas.resizeHandler();
    }

    destroy() {
        this.window.removeEventListener("keydown", this.controller.keyboardHandler);
        this.window.close();
        document.removeEventListener("visibilitychange", this.visibilityListener);
    }
}
