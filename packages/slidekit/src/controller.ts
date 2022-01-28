import SlideDeck, { SlideSpec, DomPlugin } from "./slidedeck";
import PresenterNotes from "./presenternotes";
import Timer from "./timer";
import Canvas from "./canvas";
import SlidePlayer from "./slideplayer";
import Cockpit from "./cockpit";
import Shortcuts from "./shortcuts";
import { Duration } from "moment";
import { ScriptTemplate, EnterTransitionSpec, ExitTransitionSpec } from "./slideplayer";
import { defaultEnterTransitions, defaultExitTransitions } from "./transitions";
import { defaultPreprocessors } from "./preprocessors";
import * as Hammer from "hammerjs";

type Hook = (number) => void

type Options = {
    duration?: Duration,
    notes?: PresenterNotes,
    preprocessors?: DomPlugin[],
    scripts?: { [script: string]: ScriptTemplate }
    exitTransitions?: ExitTransitionSpec[],
    enterTransitions?: EnterTransitionSpec[],
}
export default class Controller {
    shortcuts?: Shortcuts;
    deck: SlideDeck;
    timer: Timer;
    presenterNotes?: PresenterNotes;
    cockpit?: Cockpit;

    private canvas: Canvas;
    private fullscreenNode: HTMLElement;
    private player: SlidePlayer;
    private hooks: Set<Hook> = new Set();
    private currentPosition: number;
    private runningAnimation?: any = null;
    private runningAnimationStart?: number = null;
    private runningAnimationTarget?: number = null;
    private previousRenderedPosition: number = -1;
    private historyPosition?: number = null;
    private printSection: HTMLElement;

    constructor(slides: SlideSpec[], root: HTMLDivElement, { duration, notes, scripts, preprocessors = [], enterTransitions = [], exitTransitions = [] }: Options) {
        if (slides.length == 0) {
            throw new Error("Slide list is empty");
        }

        const deck = new SlideDeck(slides, [...defaultPreprocessors, ...preprocessors])
        this.deck = deck;
        const canvas = document.createElement("div");
        root.appendChild(canvas);
        canvas.classList.add("slidekit-main-screen");
        this.canvas = new Canvas(canvas, deck.width, deck.height, true);
        this.presenterNotes = notes;
        this.fullscreenNode = canvas.parentElement;
        this.timer = new Timer(duration);
        this.player = new SlidePlayer(
            this.canvas, 
            this.deck, 
            scripts, 
            [...defaultExitTransitions, ...exitTransitions],
            [...defaultEnterTransitions, ...enterTransitions]
        );

        this.currentPosition = Math.min(this.deck.numSteps() - 1, Math.max(0, this.getPositionFromHash()));

        this.render = this.render.bind(this);
        this.fullscreenHandler = this.fullscreenHandler.bind(this);
        this.keyboardHandler = this.keyboardHandler.bind(this);

        // Event handling
        this.fullscreenNode.addEventListener("fullscreenchange", this.fullscreenHandler);
        this.fullscreenNode.addEventListener("webkitfullscreenchange", this.fullscreenHandler);
        document.addEventListener("keydown", this.keyboardHandler);

        // Play on render
        this.addRenderListener(this.player.render.bind(this.player));

        // Close the cockpit when we close this window
        window.addEventListener("unload", () => {
            if (this.cockpit != null) {
                this.cockpit.window.close();
            }
        });

        // Browser history
        window.addEventListener("popstate", event => {
            const location = this.getPositionFromHash();
            this.historyPosition = location;
            this.setPosition(location);
        });

        // Printing
        this.printSection = document.createElement("div");
        this.printSection.className = "slidekit-print-section";
        document.body.appendChild(this.printSection);
        window.addEventListener("beforeprint", this.populatePrintSection.bind(this));
        // window.addEventListener("afterprint", () => this.printSection.innerHTML = "");

        // Tap events
        const mc = new Hammer.Manager(root);
        mc.add(new Hammer.Tap());
        mc.on("tap", (e) => {
            if (e.pointerType !== "touch") return;
            const rect = root.getBoundingClientRect();
            const x = (e.center.x - rect.x) / rect.width;
            if (x < .2) {
                this.prevStage();
            } else if (x > .8) {
                this.nextStage();
            }
        })

        // Render for the first time
        requestAnimationFrame(this.render);

    }

    render() {
        if (this.currentPosition !== this.previousRenderedPosition) {
            this.previousRenderedPosition = this.currentPosition;
            for (let hook of this.hooks) {
                hook(this.currentPosition);
            }
            if (
                this.currentPosition === Math.floor(this.currentPosition) &&
                this.currentPosition !== this.historyPosition
            ) {
                history.pushState({ position: this.currentPosition }, "", `#${this.currentPosition}`);
            }
        }
        requestAnimationFrame(this.render);
    }

    /**
     * Go there without any animation
     */
    setPosition(position) {
        this.cancelRunningAnimation();
        this.currentPosition = Math.min(this.deck.numSteps() - 1, Math.max(0, position));
    }

    nextStage() {
        if (!this.cancelRunningAnimation("right")) {
            const targetPosition = Math.min(this.deck.numSteps() - 1, Math.floor(this.currentPosition) + 1);
            const duration = this.durationBetweenPoints(this.currentPosition, targetPosition);
            if (duration === 0) {
                this.setPosition(targetPosition);
            } else {
                this.startAnimationTo(targetPosition, duration);
            }
        }
    }

    prevStage() {
        if (!this.cancelRunningAnimation("left")) {
            const targetPosition = Math.max(0, Math.ceil(this.currentPosition) - 1);
            const duration = this.durationBetweenPoints(this.currentPosition, targetPosition);
            if (duration === 0) {
                this.setPosition(targetPosition);
            } else {
                this.startAnimationTo(targetPosition, duration);
            }
        }
    }

    nextSlide() {
        this.cancelRunningAnimation();
        const targetPosition = this.deck.nextSlideIndex(this.currentPosition);
        if (targetPosition == null) return;
        this.setPosition(targetPosition);
    }

    prevSlide() {
        this.cancelRunningAnimation();
        const targetPosition = this.deck.prevSlideIndex(this.currentPosition);
        if (targetPosition == null) return;
        this.setPosition(targetPosition);
    }

    goToSlide(slideNumber: number) {
        const stageIdx = this.deck.firstStageForSlide(slideNumber);
        this.setPosition(stageIdx);
    }

    startAnimationTo(targetPosition: number, duration: number) {
        const startTime = Date.now();
        const startPosition = this.currentPosition;
        this.runningAnimationTarget = targetPosition;
        this.runningAnimationStart = startPosition;
        const update = () => {
            const alpha = Math.min(1.0, (Date.now() - startTime) / duration / 1000);
            this.currentPosition = startPosition + (targetPosition - startPosition) * alpha;
            if (alpha === 1) {
                clearInterval(this.runningAnimation);
                this.runningAnimation = null;
            }
        };
        update();
        this.runningAnimation = setInterval(update, 3);
    }

    addRenderListener(hook: Hook) {
        this.hooks.add(hook);
        hook(this.currentPosition);
    }

    removeRenderListener(hook: Hook) {
        this.hooks.delete(hook);
    }

    goFullscreen() {
        const { dom } = this.canvas;
        if (dom.requestFullscreen) {
            dom.requestFullscreen();
        } else if ((dom as any).webkitRequestFullscreen) {
            (dom as any).webkitRequestFullscreen();
        }
    }

    keyboardHandler(event: KeyboardEvent) {
        if (["ArrowRight", "ArrowDown", "]"].includes(event.key)) {
            if (event.shiftKey) {
                this.nextSlide();
            } else {
                this.nextStage();
            }
        } else if (["ArrowLeft", "ArrowUp", "["].includes(event.key)) {
            if (event.shiftKey) {
                this.prevSlide();
            } else {
                this.prevStage();
            }
        } else if (event.key === "f") {
            this.goFullscreen();
        } else if (event.key === "t") {
            this.timer.toggle();
        } else if (event.key === "r") {
            this.timer.reset();
        } else if (event.key === "?") {
            if (this.shortcuts == null) {
                this.shortcuts = new Shortcuts(this);
            }
        } else if (event.key === "c" || event.key === "p") {
            if (event.ctrlKey || event.shiftKey || event.altKey || event.metaKey) return;
            // Open a child window
            if (this.cockpit == null) {
                this.cockpit = new Cockpit(this);
            }
        } else if (event.key === "q" || event.key === "Escape") {
            // Open a child window
            if (this.shortcuts != null) {
                this.shortcuts.close();
            } else if (this.cockpit != null) {
                this.cockpit.window.close();
            }
        } else if (event.key === "Home") {
            this.setPosition(0);
        } else if (event.key === "g") {
            // Go to slide ...
            let number = "";
            const handler = event => {
                if ("0123456789".includes(event.key)) {
                    number += event.key;
                } else {
                    if (number.length > 0) {
                        this.goToSlide(parseFloat(number));
                    }
                    document.removeEventListener("keydown", handler, true);
                }
                event.stopPropagation();
            };
            document.addEventListener("keydown", handler, true);
        } else if (event.key === "End") {
            this.setPosition(this.deck.numSteps() - 1);
        } else if (event.key === "b") {
            document.body.classList.toggle("slidekit-blacked-out");
        } else if (event.key === "w") {
            document.body.classList.toggle("slidekit-blacked-out-white");
        }
    }

    private durationBetweenPoints(a: number, b: number) {
        const t1 = Math.min(a, b);
        const t2 = Math.max(a, b);
        let duration = 0.0;
        let x = t1;
        while (x < t2) {
            let nextX = Math.min(t2, Math.floor(x + 1));
            const stage = Math.floor(x);
            duration += (nextX - x) * this.player.stageDuration(stage);
            x = nextX;
        }
        return duration;
    }

    private cancelRunningAnimation(snapTo: string = "right") {
        const wasRunning = this.runningAnimation != null;
        if (wasRunning) {
            clearInterval(this.runningAnimation);
            if (snapTo === "right") {
                this.currentPosition = Math.max(this.runningAnimationStart, this.runningAnimationTarget);
            } else {
                this.currentPosition = Math.min(this.runningAnimationStart, this.runningAnimationTarget);
            }
            this.runningAnimation = null;
            this.runningAnimationTarget = null;
            this.runningAnimationStart = null;
        }
        return wasRunning;
    }

    private getPositionFromHash() {
        return parseFloat(window.location.hash.substr(1)) || 0;
    }

    private fullscreenHandler() {
        this.canvas.resizeHandler();
    }

    private populatePrintSection() {
        const style = document.createElement("style");
        style.setAttribute("rel", "stylesheet");
        style.innerHTML = `        
            @page { 
                margin: 0; 
                padding: 0;
                size: ${this.deck.width}px ${this.deck.height}px;
            }
        `;
        this.printSection.innerHTML = "";
        this.printSection.appendChild(style);

        for (let slide of this.deck.slides) {
            const iframe = document.createElement("iframe");
            iframe.className = "slidekit-print-section-slide";
            iframe.style.width = `${slide.width}px`;
            iframe.style.height = `${slide.height}px`;
            iframe.setAttribute("seamless", "seamless");
            iframe.addEventListener("load", () => {
                iframe.contentDocument.body.style.overflow = "hidden";
                iframe.contentDocument.body.style.margin = "0";
                iframe.contentDocument.body.style.padding = "0";
                iframe.contentDocument.body.innerHTML = slide.steps[slide.steps.length - 1].step.dom.outerHTML;
            })
            this.printSection.appendChild(iframe);
        }
    }

}
