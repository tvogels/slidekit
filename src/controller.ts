import SlideDeck from "./slidedeck";
import PresenterNotes from "./presenternotes";
import Timer from "./timer";
import SlidePlayer from "./slideplayer";
import Cockpit from "./cockpit";
import Shortcuts from "./shortcuts";
import {Duration} from "moment";

type Hook = (number) => void

export default class Controller {
    shortcuts?: Shortcuts
    deck: SlideDeck
    timer: Timer
    presenterNotes?: PresenterNotes
    cockpit?: Cockpit

    private canvas: Canvas
    private fullscreenNode: HTMLElement
    private player: SlidePlayer
    private hooks: Set<Hook>
    private currentPosition: number
    private runningAnimation?: any
    private runningAnimationStart?: number
    private runningAnimationTarget?: number
    private previousRenderedPosition: number
    private historyPosition?: number

    constructor(deck: SlideDeck, canvas: HTMLDivElement, talkDuration: Duration, presenterNotes?: PresenterNotes) {
        this.deck = deck;
        this.canvas = new Canvas(canvas, deck.width, deck.height, true);
        this.presenterNotes = presenterNotes;
        this.fullscreenNode = canvas.parentElement;
        this.timer = new Timer(talkDuration);
        this.player = new SlidePlayer(this.canvas, this.deck);

        this.hooks = new Set(); // get notified for position updates

        this.currentPosition = this._getPositionFromHash();
        this.runningAnimation = null;
        this.runningAnimationTarget = null;
        this.previousRenderedPosition = -1;

        this.render = this.render.bind(this);
        this._fullscreenHandler = this._fullscreenHandler.bind(this);
        this._keyboardHandler = this._keyboardHandler.bind(this);
        this._resizeCanvasToFit = this._resizeCanvasToFit.bind(this);

        this.fullscreenNode.addEventListener("fullscreenchange", this._fullscreenHandler);
        document.addEventListener("keydown", this._keyboardHandler);

        this.addRenderListener(this.player.render.bind(this.player));

        window.addEventListener("unload", () => {
            if (this.cockpit != null) {
                this.cockpit.window.close();
            }
        });

        window.addEventListener("resize", this._resizeCanvasToFit);
        setTimeout(this._resizeCanvasToFit);

        requestAnimationFrame(this.render);

        window.addEventListener("popstate", event => {
            const location = this._getPositionFromHash();
            this.historyPosition = location;
            this.setPosition(location);
        });
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
        this._cancelRunningAnimation();
        this.currentPosition = Math.min(this.deck.numSteps() - 1, Math.max(0, position));
    }

    nextStage() {
        if (!this._cancelRunningAnimation("right")) {
            const targetPosition = Math.min(this.deck.numSteps() - 1, Math.floor(this.currentPosition) + 1);
            const duration = this._durationBetweenPoints(this.currentPosition, targetPosition);
            if (duration === 0) {
                this.setPosition(targetPosition);
            } else {
                this.startAnimationTo(targetPosition, duration);
            }
        }
    }

    prevStage() {
        if (!this._cancelRunningAnimation("left")) {
            const targetPosition = Math.max(0, Math.ceil(this.currentPosition) - 1);
            const duration = this._durationBetweenPoints(this.currentPosition, targetPosition);
            if (duration === 0) {
                this.setPosition(targetPosition);
            } else {
                this.startAnimationTo(targetPosition, duration);
            }
        }
    }

    nextSlide() {
        this._cancelRunningAnimation();
        const targetPosition = this.deck.nextSlideIndex(this.currentPosition);
        if (targetPosition == null) return;
        this.setPosition(targetPosition);
    }

    prevSlide() {
        this._cancelRunningAnimation();
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
        this.canvas.dom.requestFullscreen();
    }

    _getPositionFromHash() {
        return parseFloat(window.location.hash.substr(1)) || 0;
    }

    _fullscreenHandler() {
        this.canvas.resizeHandler();
    }

    _keyboardHandler(event: KeyboardEvent) {
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
            document.body.classList.toggle("slides-blacked-out");
        } else if (event.key === "w") {
            document.body.classList.toggle("slides-blacked-out-white");
        }
    }

    _resizeCanvasToFit() {
        const bodyH = window.innerHeight - 20;
        const bodyW = window.innerWidth - 20;
        const slideH = this.canvas.dom.clientHeight;
        const slideW = this.canvas.dom.clientWidth;
        const scale = Math.min(bodyH / slideH, bodyW / slideW, 1);
        const scaleString = `scale(${scale})`;
        if (this.canvas.dom.style.transform != scaleString) {
            this.canvas.dom.style.transform = scaleString;
        }
    }

    _durationBetweenPoints(a: number, b: number) {
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

    _cancelRunningAnimation(snapTo: string = "right") {
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
}

export class Canvas {
    dom: HTMLElement
    private canvas: HTMLDivElement
    private slideNumber: HTMLDivElement
    private width: number
    private height: number

    constructor(domElement: HTMLDivElement, deckWidth: number, deckHeight: number, withSlideNumbers = false) {
        this.dom = domElement;

        this.canvas = document.createElement("div");
        this.canvas.className = "slides-canvas";
        this.dom.appendChild(this.canvas);

        if (withSlideNumbers) {
            this.slideNumber = document.createElement("div");
            this.slideNumber.className = "slides-slide-number";
            this.dom.appendChild(this.slideNumber);
        } else {
            this.slideNumber = null;
        }

        this.canvas.style.transformOrigin = "0 0";
        this.canvas.style.transform = "scale(1)";
        this.canvas.style.transform = "scale(1)";

        this.width = deckWidth;
        this.height = deckHeight;

        this.dom.addEventListener("resize", this.resizeHandler);
        this.resizeHandler = this.resizeHandler.bind(this);
        setTimeout(this.resizeHandler);
        setTimeout(this.resizeHandler, 100); // Hack for Firefox
    }

    /**
     * Replace the contents of the screen with this SVG image
     * @param {HTMLElement} svg
     */
    setSvg(svg) {
        this.canvas.innerHTML = "";
        this.canvas.appendChild(svg);
    }

    setSlideNumber(number) {
        if (this.slideNumber != null) {
            this.slideNumber.innerText = number;
        }
    }

    resizeHandler() {
        const scale = Math.min(this.dom.clientHeight / this.height, this.dom.clientWidth / this.width);
        const offsetY = (this.dom.clientHeight - scale * this.height) / 2;
        const offsetX = (this.dom.clientWidth - scale * this.width) / 2;
        this.canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
    }
}
