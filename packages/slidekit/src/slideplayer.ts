import easing from "./utils/easing";
import moveTransitions from "./transitions/move";
import fadeOutTransitions from "./transitions/fadeOut";
import fadeInTransitions from "./transitions/fadeIn";
import fadeDownTransitions from "./transitions/fadeDown";
import drawLineTransitions from "./transitions/drawLine";
import appearAlongTransitions from "./transitions/appearAlong";
import SlideDeck, {Step} from "./slidedeck"
import {Canvas} from "./controller"
import { Transition } from "./transitions/utils";

export type Script = {
    setNode: (node: HTMLElement) => void,
    deactivate: () => void,
    tick: (dt: number) => void,
}

/**
 * This is responsible for rendering a current position in the slideshow
 * to a canvas. It holds 'stages' which are responsible for a 'step' and
 * the transition to the next 'step'.
 */
export default class SlidePlayer {
    canvas: Canvas
    stages: Stage[] = [];

    private visibleStage?: number = null;
    private deck: SlideDeck
    private activeScripts: Set<string> = new Set();
    private scripts: Map<string, Script> = new Map();

    constructor(canvas: Canvas, deck: SlideDeck) {
        this.canvas = canvas;
        this.deck = deck;

        for (let i = 0; i < deck.numSteps(); i++) {
            this.stages.push(new Stage(deck.step(i), deck.step(i + 1)));
        }
    }

    render(t: number) {
        let i = Math.floor(t);
        let stage = this.stages[i];
        stage.render(t - Math.floor(t));

        // Swap the visible slide if necessary
        if (i != this.visibleStage) {
            this.visibleStage = i;
            this.canvas.setSvg(stage.dom);

            this.updateActiveScripts(stage);
            this.renderSlideNumber(i);
        }

        for (let scriptName of this.activeScripts) {
            if (this.scripts.has(scriptName)) {
                this.scripts.get(scriptName).tick(t - this.deck.scriptStarts[scriptName]);
            }
        }
    }

    registerScript(name: string, script: Script) {
        this.scripts.set(name, script);
    }

    renderSlideNumber(t: number) {
        const number = this.deck.slideNumber(t);
        const total = this.deck.lastSlideNumber();
        this.canvas.setSlideNumber(`${number} / ${total}`);
    }

    stageDuration(stageNo: number) {
        return this.stages[stageNo].duration();
    }

    private updateActiveScripts(stage: Stage) {
        const newActiveScripts = new Set(Object.keys(stage.scriptNodes));
        for (let [scriptName, node] of Object.entries(stage.scriptNodes)) {
            if (this.scripts.has(scriptName)) {
                this.scripts.get(scriptName).setNode(this.canvas.dom.querySelector(`#${node}`));
            } else {
                console.error(`Missing script definition for ${scriptName}.`)
            }
        }
        for (let scriptName of this.activeScripts) {
            if (!newActiveScripts.has(scriptName)) {
                if (!this.scripts.has(scriptName)) continue;
                this.scripts.get(scriptName).deactivate();
            }
        }
        this.activeScripts = newActiveScripts;
    }
}

type Callback = (number) => void;

/**
 * A 'stage' represents the time between a step and the next step.
 * So it can also render intermediate values.
 * It basically defines the transition
 */
class Stage {
    dom: HTMLElement
    scriptNodes: {[script: string]: string}
    private transitions: Callback[]
    private transitionDuration: number

    constructor(step: Step, nextStep?: Step) {
        this.dom = step.dom.cloneNode(true) as HTMLElement;
        this.transitions = [];
        this.transitionDuration = 0;
        this.scriptNodes = step.scriptNodes;

        if (nextStep == null) return;

        const transitionPlugins = [
            moveTransitions,
            fadeInTransitions,
            fadeDownTransitions,
            drawLineTransitions,
            appearAlongTransitions,
            fadeOutTransitions,
        ]
        for (let transitionPlugin of transitionPlugins) {
            for (let transition of transitionPlugin(this.dom, step, nextStep)) {
                this._addTransition(transition);
            }
        }
    }

    /**
     * Update the state of the DOM nodes that this Stage manages
     * for an intermediate position `dt`
     * @param {number} dt between 0 and 1
     */
    render(dt: number) {
        this.transitions.forEach(t => t(dt));
    }

    _addTransition({duration, alignment, mode, callback}: Transition) {
        this.transitionDuration = Math.max(this.transitionDuration, duration);
        this.transitions.push(t => {
            const leftOverTime = this.duration() - duration;
            const startOffset = leftOverTime * alignment;
            callback(easing[mode](Math.min(1, Math.max(0, (t * this.duration() - startOffset) / duration))));
        });
    }

    /**
     * Get the duration of the transition between this slide and the next.
     */
    duration() {
        return this.transitionDuration;
    }
}
