import snap from "snapsvg";
import { getAngleAtPath, linearMix } from "./utils";
import easing from "./utils/easing";
import moveTransitions from "./transitions/move";
import fadeOutTransitions from "./transitions/fadeOut";
import fadeInTransitions from "./transitions/fadeIn";
import fadeDownTransitions from "./transitions/fadeDown";
import drawLineTransitions from "./transitions/drawLine";
import appearAlongTransitions from "./transitions/appearAlong";

/**
 * This is responsible for rendering a current position in the slideshow
 * to a canvas. It holds 'stages' which are responsible for a 'step' and
 * the transition to the next 'step'.
 */
export default class SlidePlayer {
    /**
     *
     * @param {Canvas} canvas
     * @param {SlideDeck} deck
     */
    constructor(canvas, deck) {
        this.canvas = canvas;
        this.visibleStage = null;
        this.currentPosition = null;
        this.slideStartIndices = [];
        this.slideEndIndices = [];
        this.slideNumbers = [];

        this.deck = deck;
        this.stages = [];

        for (let i = 0; i < deck.numSteps(); i++) {
            this.stages.push(new Stage(deck.step(i), deck.step(i + 1)));
        }
    }

    render(t) {
        let i = Math.floor(t);
        let stage = this.stages[i];
        stage.render(t - Math.floor(t));
        this.currentPosition = t;

        // Swap the visible slide if necessary
        if (i != this.visibleStage) {
            this.visibleStage = i;
            this.canvas.setSvg(stage.dom);
            this.renderSlideNumber(i);
        }
    }

    renderSlideNumber(t) {
        const number = this.deck.slideNumber(t);
        const total = this.deck.lastSlideNumber();
        this.canvas.setSlideNumber(`${number} / ${total}`);
    }

    stageDuration(stageNo) {
        return this.stages[stageNo].duration();
    }
}

/**
 * A 'stage' represents the time between a step and the next step.
 * So it can also render intermediate values.
 * It basically defines the transition
 */
class Stage {
    /**
     * @param {Step} step
     * @param {Step?} nextStep
     */
    constructor(step, nextStep = undefined) {
        this.dom = step.dom.cloneNode(true);
        this.isFirstStep = step.isFirst;
        this.isLastStep = step.isLast;
        this.transitions = [];
        this.transitionDuration = 0;

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
    render(dt) {
        this.transitions.forEach(t => t(dt));
    }

    _addTransition({duration, alignment, mode, callback}) {
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
