import snap from 'snapsvg'
import CSSTransform from './utils/css-transform'
import { getAngleAtPath, linearMix, maxStage } from './utils'
import easing from './utils/easing'

/**
 * A 'Slide' can consist of multiple 'steps'.
 * This hold one such step.
 */
class Step {
    constructor(dom, stage) {
        this.dom = dom.cloneNode(true);
        const lastStage = maxStage(this.dom);
        this.isFirst = stage === 0;
        this.isLast = stage === lastStage;
        this.adaptDomToStage(this.dom, stage, lastStage);
        this._buildIndex();
    }
    adaptDomToStage(domNode, stageNumber, lastStage) {
        for (let node of domNode.querySelectorAll('[stage]')) {
            const nodeStage = node.getAttribute('stage') || 0;
            if (nodeStage > stageNumber) {
                window.temp = node;
                node.parentElement.removeChild(node);
            } else {
                this.adaptDomToStage(node, stageNumber, lastStage);
            }
            node.removeAttribute('stage');
        }
        // Fade-ins should only happen when they appear
        for (let node of domNode.querySelectorAll('[transition=fade-in]')) {
            const nodeStage = node.getAttribute('stage') || 0;
            if (nodeStage !== stageNumber) {
                node.removeAttribute("transition");
            }
        }
        // Fade-outs should only happen when the node disappears
        for (let node of domNode.querySelectorAll('[transition=fade-out]')) {
            if (stageNumber !== lastStage) {
                node.removeAttribute("transition");
            }
        }
        if (!this.isLast && !this.isFirst) {
            for (let node of domNode.querySelectorAll('[move=true]')) {
                node.removeAttribute("move");
            }
        }
        for (let node of domNode.querySelectorAll('[scale]')) {
            // This is not a good place for this. Should be done in pre-processing (Python) probably
            const scale = node.getAttribute('scale');
            node.setAttribute("transform", node.getAttribute("transform") + " " + `scale(${scale})`);
            node.removeAttribute("scale");
        }
    }

    _buildIndex() {
        this.index = {};
        this.dom.querySelectorAll("[move=true]").forEach(node => {
            const id = node.getAttribute("identifier");
            this.index[id] = node;
        });
    }

    /**
     * Quickly find a dom node by identifier
     * @param {string} identifier 
     */
    nodeByIdentifier(identifier) {
        return this.index[identifier];
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
        for (let node of nextStep.dom.querySelectorAll('[transition=fade-in]')) {
            const correspondingParent = this._findCorrespondingParent(node, this.dom);
            node.removeAttribute("transition");
            const ghostNode = node.cloneNode(true);
            correspondingParent.appendChild(ghostNode);
            ghostNode.style.opacity = 0.0;
            this._addTransition(
                this._getTransitionDuration(node),
                1.0,
                "easeInCubic",
                (dt) => { ghostNode.style.opacity = linearMix(0.0, node.style.opacity || 1.0, dt) }
            );
        }
        for (let node of this.dom.querySelectorAll('[transition=fade-out]')) {
            node.removeAttribute("transition");
            const startOpacity = node.style.opacity || 1.0;
            this._addTransition(
                this._getTransitionDuration(node),
                0.0,
                "easeOutCubic",
                (dt) => { node.style.opacity = linearMix(startOpacity, 0.0, dt) }
            );
        }
        for (let node of nextStep.dom.querySelectorAll('[transition=draw-line]')) {
            const correspondingParent = this._findCorrespondingParent(node, this.dom);
            const length = node.getTotalLength();
            const ghostNode = node.cloneNode(true);
            ghostNode.style.strokeDasharray = length;
            ghostNode.style.strokeDashoffset = length;
            correspondingParent.appendChild(ghostNode);
            node.removeAttribute("transition");
            this._addTransition(
                this._getTransitionDuration(node),
                1.0,
                "easeInOutQuad",
                (dt) => { ghostNode.style.strokeDashoffset = linearMix(length, 0.0, dt) }
            );
        }
        for (let node of nextStep.dom.querySelectorAll('[appear-along]')) {
            const path = nextStep.dom.getElementById(node.getAttribute("appear-along"));
            const sp = snap(path);
            const length = sp.getTotalLength();
            const endpoint = sp.getPointAtLength(length);
            const endangle = getAngleAtPath(sp, 1.0, length);
            const origTransform = node.getAttribute("transform") || "";
            // path.style.display = 'none';
            node.removeAttribute("appear-along");

            const ghostNode = node.cloneNode(true);
            const correspondingParent = this._findCorrespondingParent(node, this.dom);
            correspondingParent.appendChild(ghostNode);

            this._addTransition(
                this._getTransitionDuration(node),
                1.0,
                "easeInOutQuad",
                (dt) => {
                    ghostNode.setAttribute('opacity', dt > 0 ? 1 : 0);
                    const pos = sp.getPointAtLength(dt * length);
                    pos.x -= endpoint.x;
                    pos.y -= endpoint.y;
                    const angle = getAngleAtPath(sp, dt, length) - endangle;
                    const transform = `${origTransform} translate(${pos.x}, ${pos.y}) rotate(${angle}, ${endpoint.x}, ${endpoint.y})`;
                    ghostNode.setAttribute('transform', transform);
                }
            );
        }
        for (let node of this.dom.querySelectorAll('[move=true]')) {
            if (!this.isLastStep) continue;
            const id = node.getAttribute("identifier");
            const nodeInNextStage = nextStep.nodeByIdentifier(id);
            if (nodeInNextStage == null) continue; // no match ... too bad
            const attributes = new Set();
            for (let attribute of nodeInNextStage.attributes) {
                attributes.add(attribute.name);
            }
            for (let attribute of node.attributes) {
                attributes.add(attribute.name);
            }
            for (let attribute of attributes) {
                let defaultValue = { "opacity": 1, "transform": "" }[attribute];
                if (defaultValue == null) {
                    defaultValue = 0.0;
                }
                const currentValue = node.getAttribute(attribute) || defaultValue;
                const nextValue = nodeInNextStage.getAttribute(attribute) || defaultValue;
                if (currentValue !== nextValue) {
                    if (["d", "fill", "stroke"].includes(attribute)) {
                        // We are using snap.svg for morphing between SVG paths
                        let eq = snap(node).equal(attribute, nextValue);
                        this._addTransition(
                            this._getTransitionDuration(node),
                            0.5,
                            "easeInOutQuad",
                            (dt) => { node.setAttribute(attribute, eq.f(linearMix(eq.from, eq.to, dt))) }
                        )
                    } else if (['x', 'y', 'opacity', 'rx', 'height', 'width'].includes(attribute)) {
                        this._addTransition(
                            this._getTransitionDuration(node),
                            0.5,
                            "easeInOutQuad",
                            (dt) => { node.setAttribute(attribute, linearMix(parseFloat(currentValue), parseFloat(nextValue), dt)) }
                        )
                    } else if (attribute === "transform") {
                        const a = new CSSTransform(currentValue);
                        const b = new CSSTransform(nextValue);
                        this._addTransition(
                            this._getTransitionDuration(node),
                            0.5,
                            "easeInOutQuad",
                            (dt) => { node.setAttribute(attribute, a.mixString(b, dt)) }
                        )
                    } else {
                        console.error(`Don't know how to handle transitions for attribute '${attribute}'`);
                    }
                }
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

    /**
     * Add a transition to be rendered at 'render'
     * @param {number} duration 
     * @param {number} alignment between 0 and 1, 0=start directly, 1=postpone till last moment, 0.5=in the middle of the transition
     * @param {string} easeFn easing function
     * @param {(t: number) => void} transition function called with a number between 0 and 1
     */
    _addTransition(duration, alignment, easeFn, transition) {
        this.transitionDuration = Math.max(this.transitionDuration, duration);
        this.transitions.push(t => {
            const leftOverTime = this.duration() - duration;
            const startOffset = leftOverTime * alignment;
            transition(easing[easeFn](Math.min(1, Math.max((t * this.duration() - startOffset) / duration))))
        });
    }

    /**
     * Get the duration of the transition between this slide and the next.
     */
    duration() {
        return this.transitionDuration;
    }

    /**
     * Read transition duration from an SVG element or resort to the default
     * @param {HTMLElement} node 
     */
    _getTransitionDuration(node) {
        return parseFloat(node.getAttribute("duration")) || 0.5;
    }

    /**
     * Select a node in `domTree` that looks most like the parent of `node`
     * @param {HTMLElement} node 
     * @param {HTMLElement} domTree
     */
    _findCorrespondingParent(node, domTree) {
        const parentId = node.parentElement.id;
        let correspondingParent;
        if (domTree.id === parentId) {
            correspondingParent = domTree;
        } else {
            correspondingParent = domTree.getElementById(parentId);
        }
        if (correspondingParent == null) {
            correspondingParent = domTree;
            console.error(`Couldn't match parent with id #${parentId}, using ${correspondingParent.id} instead.`);
        };
        return correspondingParent;
    }
}

/**
 * Responsible for delegating rendering to the 'stages' it holds
 */
export class SlideDeck {
    constructor(canvas, slideStrings) {
        this.canvas = canvas;
        this.stages = [];
        this.visibleStage = null;
        this.currentPosition = null;
        this.slideStartIndices = [];
        this.slideEndIndices = [];
        this.slideNumbers = [];
        const stepList = [];
        let i = 0;
        let slideNumber = 0;
        for (let slideString of slideStrings) {
            slideNumber += 1;
            this.slideStartIndices.push(i);
            const html = document.createElement('html');
            html.innerHTML = slideString;
            const svg = html.querySelector('svg');
            const lastStage = maxStage(svg);
            for (let stage = 0; stage <= lastStage; stage++) {
                stepList.push(new Step(svg, stage));
                i += 1;
                this.slideNumbers.push(slideNumber);
            }
            this.slideEndIndices.push(i - 1);
        }
        for (let i = 0; i < stepList.length; i++) {
            this.stages.push(new Stage(stepList[i], stepList[i + 1]));
        }
    }
    nextSlideIndex(position) {
        return this.slideEndIndices.find((s) => s > position);
    }
    slideNumber(position) {
        return this.slideNumbers[Math.floor(position)];
    }
    firstStageForSlide(slideNumber) {
        return this.slideNumbers.findIndex((x) => x === slideNumber) || 0;
    }
    lastSlideNumber() {
        return this.slideNumbers[this.slideNumbers.length - 1];
    }
    prevSlideIndex(position) {
        // .reverse() is in-place, and we don't want to modify the original array, so hence the [...] to copy
        return [...this.slideEndIndices].reverse().find((s) => s < position);
    }
    render(t) {
        let i = Math.floor(t);
        let stage = this.stages[i];
        stage.render(t - Math.floor(t));
        this.currentPosition = t;

        // Swap the visible slide of necessary
        if (i != this.visibleStage) {
            this.visibleStage = i;
            this.canvas.innerHTML = "";
            this.canvas.appendChild(stage.dom);
        }
        this.renderSlideNumber(t);
    }
    renderSlideNumber(t) {
        const elem = document.getElementById("slide-number");
        if (elem == null) return;
        const number = this.slideNumber(t);
        const total = this.lastSlideNumber();
        elem.innerText = `${number} / ${total}`;
    }
}

export class Controller {
    constructor(slideDeck) {
        this.deck = slideDeck;
        this.currentPosition = 0.0;
        this.render = this.render.bind(this);
        this.runningAnimation = null;
        this.runningAnimationTarget = null;
        requestAnimationFrame(this.render)
    }
    render() {
        if (this.currentPosition !== this.deck.currentPosition) {
            this.deck.render(this.currentPosition);
        }
        requestAnimationFrame(this.render);
    }

    /**
     * Go there without any animation
     */
    setPosition(position) {
        this._cancelRunningAnimation();
        this.currentPosition = Math.min(this.deck.stages.length - 1, Math.max(0, position));
    }

    nextStage() {
        this._cancelRunningAnimation();
        const targetPosition = Math.min(this.deck.stages.length - 1, Math.floor(this.currentPosition) + 1);
        const duration = this._durationBetweenPoints(this.currentPosition, targetPosition);
        if (duration === 0) {
            this.setPosition(targetPosition);
        } else {
            this.startAnimationTo(targetPosition, duration);
        }
    }
    prevStage() {
        this._cancelRunningAnimation();
        const targetPosition = Math.max(0, Math.ceil(this.currentPosition) - 1);
        const duration = this._durationBetweenPoints(this.currentPosition, targetPosition);
        if (duration === 0) {
            this.setPosition(targetPosition);
        } else {
            this.startAnimationTo(targetPosition, duration);
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
    /**
     * @param {number} slideNumber 
     */
    goToSlide(slideNumber) {
        const stageIdx = this.deck.firstStageForSlide(slideNumber);
        this.setPosition(stageIdx);
    }
    startAnimationTo(targetPosition, duration) {
        const startTime = Date.now();
        const startPosition = this.currentPosition;
        this.runningAnimationTarget = targetPosition;
        const update = () => {
            const alpha = Math.min(1.0, (Date.now() - startTime) / duration / 1000);
            // console.log('update', alpha);
            this.currentPosition = startPosition + (targetPosition - startPosition) * alpha;
            if (alpha === 1) {
                clearInterval(this.runningAnimation);
                this.runningAnimation = null;
            }
        };
        update();
        this.runningAnimation = setInterval(update, 3);
    }

    _durationBetweenPoints(a, b) {
        const t1 = Math.min(a, b);
        const t2 = Math.max(a, b);
        let duration = 0.0;
        let x = t1;
        while (x < t2) {
            let nextX = Math.min(t2, Math.floor(x + 1));
            const slide = Math.floor(x);
            duration += (nextX - x) * this.deck.stages[slide].duration();
            x = nextX;
        }
        return duration;
    }

    _cancelRunningAnimation() {
        const wasRunning = (this.runningAnimation != null);
        if (wasRunning) {
            clearInterval(this.runningAnimation);
            this.currentPosition = this.runningAnimationTarget;
            this.runningAnimation = null;
            this.runningAnimationTarget = null;
        }
        return wasRunning;
    }
}


export class KeyboardController {
    constructor(controller, canvasNode, fullscreenNode) {
        this.controller = controller;
        this.canvasNode = canvasNode;
        this.fullscreenNode = fullscreenNode;
        this.fullscreenHandler = this.fullscreenHandler.bind(this);
        this.keydownHandler = this.keydownHandler.bind(this);
        document.addEventListener('keydown', this.keydownHandler);
        this.fullscreenNode.addEventListener('fullscreenchange', this.fullscreenHandler);
    }

    destruct() {
        document.removeEventListener('keydown', this.keydownHandler);
        this.fullscreenNode.removeEventListener('fullscreenchange', this.fullscreenHandler);
    }

    keydownHandler(event) {
        if (['ArrowRight', 'ArrowDown', ']'].includes(event.key)) {
            if (event.shiftKey) {
                this.controller.nextSlide();
            } else {
                this.controller.nextStage();
            }
        } else if (['ArrowLeft', 'ArrowUp', '['].includes(event.key)) {
            if (event.shiftKey) {
                this.controller.prevSlide();
            } else {
                this.controller.prevStage();
            }
        } else if (event.key === 'f') {
            this.goFullscreen();
        } else if (event.key === 'Home') {
            this.controller.setPosition(0);
        } else if (event.key === 'g') {
            let number = '';
            const handler = (event) => {
                if ('0123456789'.includes(event.key)) {
                    number += event.key;
                } else {
                    if (number.length > 0) {
                        this.controller.goToSlide(parseFloat(number));
                    }
                    document.removeEventListener('keydown', handler, true);
                }
                event.stopPropagation();
            };
            document.addEventListener('keydown', handler, true);
        } else if (event.key === 'End') {
            this.controller.setPosition(this.controller.deck.stages.length - 1);
        } else if (event.key === 'b') {
            document.body.classList.toggle('blacked-out');
        } else if (event.key === 'w') {
            document.body.classList.toggle('blacked-out-white');
        }
    }

    fullscreenHandler() {
        const scale = Math.min(this.fullscreenNode.clientHeight / this.canvasNode.clientHeight, this.fullscreenNode.clientWidth / this.canvasNode.clientWidth)
        this.canvasNode.style.transform = `scale(${scale})`;
    }

    goFullscreen() {
        this.fullscreenNode.requestFullscreen();
    }
}
