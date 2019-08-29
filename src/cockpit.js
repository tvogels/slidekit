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
        this.prepareWindow();

        // Current step view
        this.currentSlidePlayer = new SlidePlayer(
            this.document.getElementById("current-slide"),
            controller.deck,
            false
        );
        const currentSlideHook = this.currentSlidePlayer.render.bind(this.currentSlidePlayer);
        controller.addRenderListener(currentSlideHook);
        this.window.addEventListener("unload", controller.removeRenderListener.bind(controller, currentSlideHook));

        // Next step view
        this.nextSlidePlayer = new SlidePlayer(this.document.getElementById("next-slide"), controller.deck, false);
        const nextSlideHook = i => this.nextSlidePlayer.render(Math.min(i + 1, this.nextSlidePlayer.stages.length - 1));
        controller.addRenderListener(nextSlideHook);
        this.window.addEventListener("unload", controller.removeRenderListener.bind(controller, nextSlideHook));

        // Progress bar
        const progressBarBar = this.document.getElementById("progress-bar");
        const progressHandler = (elapsed, percentage) => {
            progressBarBar.style.width = `${percentage * 100}%`;
            progressBarBar.innerText = elapsed;
        };
        controller.timer.addTickListener(progressHandler);
        this.window.addEventListener(
            "unload",
            controller.timer.removeTickListener.bind(controller.timer, progressHandler)
        );

        // current stage
        const stageCanvas = this.document.getElementById("stage");
        const stageHook = i => (stageCanvas.innerText = `${Math.floor(i)}`);
        controller.addRenderListener(stageHook);
        this.window.addEventListener("unload", controller.removeRenderListener.bind(controller, stageHook));

        // Presenter notes
        if (controller.presenterNotes != null) {
            const notesDiv = this.document.getElementById("notes");
            let currentNotes = null;
            const handler = x => {
                const notes = controller.presenterNotes.getNotesForStage(x);
                if (notes !== currentNotes) {
                    notesDiv.innerHTML = "";
                    if (notes != null) {
                        notesDiv.appendChild(notes);
                    }
                    currentNotes = notes;
                }
            };
            controller.addRenderListener(handler);
            this.window.addEventListener("unload", controller.removeRenderListener.bind(controller, handler));
        }

        setTimeout(this.scaleSVGsToFit.bind(this), 100);
        const resizeHandler = () => {
            requestAnimationFrame(this.scaleSVGsToFit.bind(this));
        };
        this.window.addEventListener("resize", resizeHandler);

        this.window.addEventListener("unload", () => {
            controller.cockpit = null;
        });

        this.document.addEventListener("keydown", controller._keyboardHandler.bind(controller));
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

    prepareWindow() {
        // The identifier 'cockpit' will give us the same window every time. It will override it.
        this.window = window.open("", "cockpit");
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

    destroy() {
        this.window.removeEventListener("keydown", controller._keyboardHandler);
        this.window.close();
    }
}
