import easing from "./utils/easing";
import moveTransitions from "./transitions/move";
import fadeOutTransitions from "./transitions/fadeOut";
import fadeInTransitions from "./transitions/fadeIn";
import fadeDownTransitions from "./transitions/fadeDown";
import drawLineTransitions from "./transitions/drawLine";
import appearAlongTransitions from "./transitions/appearAlong";
import sketchTransitions from "./transitions/sketch";
import SlideDeck, {Step} from "./slidedeck"
import {Canvas} from "./controller"
import { isExiting, Transition } from "./transitions/utils";

type Script = {
    name?: string,
    setNode: (node: HTMLElement) => void,
    deactivate?: () => void,
    tick: (dt: number) => void,
    minimumDuration?: (t: number) => number,
};

export type ScriptTemplate = (name: string) => Script;

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
    private scripts: {[script: string]: Script}
    private scriptTemplates: {[script: string]: ScriptTemplate}
    private scriptsEnabled: boolean = true;

    constructor(canvas: Canvas, deck: SlideDeck, scripts: {[name: string]: ScriptTemplate} | undefined) {
        this.canvas = canvas;
        this.deck = deck;

        if (scripts != null) {
            this.scriptTemplates = scripts;
            this.scripts = {};
            for (let entry of Object.keys(this.deck.scriptStarts)) {
                const scriptName = entry.split("/")[0];
                if (this.scriptTemplates[scriptName] != null) {
                    this.scripts[entry] = {minimumDuration: () => 0, deactivate: () => null, name: entry, ...this.scriptTemplates[scriptName](entry)};
                } else {
                    console.error(`Missing script ${scriptName}`);
                }
            }
        } else {
            this.scriptsEnabled = false;
        }

        for (let i = 0; i < deck.numSteps(); i++) {
            this.stages.push(new Stage(i, deck.step(i), deck.step(i + 1)));
        }

        if (scripts != null) {
            for (let stage of this.stages) {
                for (let instance of stage.scriptInstances) {
                    const scriptName = scriptId(instance);
                    const duration = this.scripts[scriptName].minimumDuration(stage.number - this.deck.scriptStarts[scriptName]);
                    stage.reportTransitionDuration(duration);
                }
            }
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

        if (this.scriptsEnabled) {
            for (let scriptName of this.activeScripts) {
                this.scripts[scriptName].tick(t - this.deck.scriptStarts[scriptName]);
            }
        }
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
        if (!this.scriptsEnabled) return;
        const newActiveScripts = new Set(stage.scriptInstances.map(scriptId));
        for (let {script, node} of stage.scriptInstances) {
            this.scripts[scriptId({script, node})].setNode(this.canvas.dom.querySelector(`#${node}`));
        }
        for (let scriptName of this.activeScripts) {
            if (!newActiveScripts.has(scriptName)) {
                this.scripts[scriptName].deactivate();
            }
        }
        this.activeScripts = newActiveScripts;
    }
}

export function scriptId({ script, node }) {
    return `${script}/${node}`;
}

type Callback = (number) => void;

/**
 * A 'stage' represents the time between a step and the next step.
 * So it can also render intermediate values.
 * It basically defines the transition
 */
class Stage {
    dom: HTMLElement
    scriptInstances: {script: string, node: string}[]
    private transitions: Callback[]
    private transitionDuration: number
    number: number

    constructor(number: number, step: Step, nextStep?: Step) {
        this.number = number;
        this.dom = step.dom.cloneNode(true) as HTMLElement;
        this.transitions = [];
        this.transitionDuration = 0;
        this.scriptInstances = step.scriptInstances;

        if (nextStep == null) return;

        const transitionPlugins = [
            moveTransitions,
            fadeInTransitions,
            fadeDownTransitions,
            drawLineTransitions,
            sketchTransitions,
            appearAlongTransitions,
            fadeOutTransitions,
        ]
        for (let transitionPlugin of transitionPlugins) {
            for (let transition of transitionPlugin(this.dom, step, nextStep)) {
                this.addTransition(transition);
            }
        }

        for (let node of this.dom.querySelectorAll("[transition-duration]")) {
            if (!isExiting(node, step)) {
                this.reportTransitionDuration(parseFloat(node.getAttribute("transition-duration")));
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

    reportTransitionDuration(duration) {
        this.transitionDuration = Math.max(this.transitionDuration, duration);
    }

    addTransition({duration, alignment, mode, callback}: Transition) {
        this.reportTransitionDuration(duration);
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
