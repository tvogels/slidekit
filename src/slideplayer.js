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
        this.animations = {};

        for (let i = 0; i < deck.numSteps(); i++) {
            this.stages.push(new Stage(deck.step(i), deck.step(i + 1), this.animations));
        }
    }

    render(t) {
        let i = Math.floor(t);
        let stage = this.stages[i];
        for (let animation of Object.values(this.animations)) {
            animation.setVisibility(false);
        }
        stage.render(t - Math.floor(t));
        this.currentPosition = t;

        // Swap the visible slide if necessary
        if (i != this.visibleStage) {
            this.visibleStage = i;
            this.canvas.setSvg(stage.dom);
            this.renderSlideNumber(i);
        }
    }

    registerAnimation(name, animation) {
        animation.init(this.canvas.animationCanvas);
        this.animations[name] = animation;
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
    constructor(step, nextStep = undefined, animations = {}) {
        this.dom = step.dom.cloneNode(true);
        this.isFirstStep = step.isFirst;
        this.isLastStep = step.isLast;
        this.transitions = [];
        this.transitionDuration = 0;
        this.animations = animations;
        this._addTransition = this._addTransition.bind(this);

        // Animations
        for (let node of this.dom.querySelectorAll("[animation]")) {
            node.setAttribute("opacity", 0);
            const animationId = (node.getAttribute("animation") || "").split(",")[0];
            const offset = animationOffset(node, step);
            let duration = offset === 0 ? this._getTransitionDuration(node, "animation") : 1e-8;
            this._addTransition(
                duration,
                0,
                "linear",
                dt => {
                    if (this.animations[animationId] != null) {
                        const width = parseInt(node.getAttribute("width"), 10);
                        const height = parseInt(node.getAttribute("height"), 10);
                        const x = parseInt(node.getAttribute("x"), 10);
                        const y = parseInt(node.getAttribute("y"), 10);
                        this.animations[animationId].setVisibility(true);
                        this.animations[animationId].update({width, height, x, y}, dt + offset);
                    } else {
                        console.log("Could not find animation", animationId);
                    }
                }
            );
        }

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

    _addTransition({duration, alignment, mode, transition}) {
        this.transitionDuration = Math.max(this.transitionDuration, duration);
        this.transitions.push(t => {
            const leftOverTime = this.duration() - duration;
            const startOffset = leftOverTime * alignment;
            transition(easing[mode](Math.min(1, Math.max(0, (t * this.duration() - startOffset) / duration))));
        });
    }

    /**
     * Get the duration of the transition between this slide and the next.
     */
    duration() {
        return this.transitionDuration;
    }
}
