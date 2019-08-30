import snap from "snapsvg";
import CSSTransform from "./utils/css-transform";
import { getAngleAtPath, linearMix } from "./utils";
import easing from "./utils/easing";

const DEFAULT_TRANSITION_TIMES = {
    "fade-out": 0.5,
    move: 0.5,
    "fade-in": 0.5,
    "fade-down": 0.5,
    "appear-along": 0.5,
    "draw-line": 0.5
};

const DEFAULT_TRANSITION_ALIGNMENT = {
    "fade-out": 0.0, // beginning of the slide transition
    move: 0.5, // center of the slide transition
    "fade-in": 1.0, // end of the slide transition
    "fade-down": 1.0, // end of the slide transition
    "appear-along": 1.0, // end of the slide transition
    "draw-line": 1.0 // end of the slide transition
};

/**
 * This is responsible for rendering a current position in the slideshow
 * to a canvas. It holds 'stages' which are responsible for a 'step' and
 * the transition to the next 'step'.
 */
export default class SlidePlayer {
    /**
     *
     * @param {HTMLDivElement} canvas
     * @param {SlideDeck} deck
     * @param {boolean?} updateCounter
     */
    constructor(canvas, deck, updateCounter = true) {
        this.canvas = canvas;
        this.visibleStage = null;
        this.currentPosition = null;
        this.slideStartIndices = [];
        this.slideEndIndices = [];
        this.slideNumbers = [];
        this.updateCounter = updateCounter;

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

        // Swap the visible slide of necessary
        if (i != this.visibleStage) {
            this.visibleStage = i;
            this.canvas.innerHTML = "";
            this.canvas.appendChild(stage.dom);
            if (this.updateCounter) {
                this.renderSlideNumber(t);
            }
        }
    }

    renderSlideNumber(t) {
        const elem = document.getElementById("slide-number");
        if (elem == null) return;
        const number = this.deck.slideNumber(t);
        const total = this.deck.lastSlideNumber();
        elem.innerText = `${number} / ${total}`;
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

        this.index = new MoveElementIndex(this.dom);
        this.nextIndex = new MoveElementIndex(nextStep.dom);

        for (let node of this.dom.querySelectorAll("[move]")) {
            const id = node.getAttribute("id");
            const nodeInNextStage = this.nextIndex.nodeByIdentifier(id);
            if (nodeInNextStage == null) continue; // no match ... too bad

            const attributes = new Set([...node.getAttributeNames(), ...nodeInNextStage.getAttributeNames()]);
            for (let attribute of attributes) {
                let defaultValue = { opacity: 1, "fill-opacity": 1, transform: "", style: "" }[attribute];
                if (defaultValue == null) {
                    defaultValue = 0.0;
                }
                const currentValue = node.getAttribute(attribute) || defaultValue;
                const nextValue = nodeInNextStage.getAttribute(attribute) || defaultValue;
                if (currentValue !== nextValue) {
                    if (["d"].includes(attribute)) {
                        // We are using snap.svg for morphing between SVG paths
                        let eq = snap(node).equal(attribute, nextValue);
                        this._addTransition(
                            this._getTransitionDuration(node, "move"),
                            this._getTransitionAlignment(node, "move"),
                            "easeInOutQuad",
                            dt => {
                                node.setAttribute(attribute, eq.f(linearMix(eq.from, eq.to, dt)));
                            }
                        );
                    } else if (["fill", "stroke"].includes(attribute)) {
                        const c1 = snap.color(currentValue);
                        const c2 = snap.color(nextValue);
                        const from = [c1.r, c1.g, c1.b, c1.opacity];
                        const to = [c2.r, c2.g, c2.b, c2.opacity];
                        this._addTransition(
                            this._getTransitionDuration(node, "move"),
                            this._getTransitionAlignment(node, "move"),
                            "easeInOutQuad",
                            dt => {
                                node.setAttribute(attribute, snap.rgb(...linearMix(from, to, dt)));
                            }
                        );
                    } else if (
                        ["x", "y", "opacity", "rx", "height", "width", "cx", "cy", "r", "fill-opacity"].includes(
                            attribute
                        )
                    ) {
                        this._addTransition(
                            this._getTransitionDuration(node, "move"),
                            this._getTransitionAlignment(node, "move"),
                            "easeInOutQuad",
                            dt => {
                                node.setAttribute(
                                    attribute,
                                    linearMix(parseFloat(currentValue), parseFloat(nextValue), dt)
                                );
                            }
                        );
                    } else if (attribute === "transform") {
                        const a = new CSSTransform(currentValue);
                        const b = new CSSTransform(nextValue);
                        this._addTransition(
                            this._getTransitionDuration(node, "move"),
                            this._getTransitionAlignment(node, "move"),
                            "easeInOutQuad",
                            dt => {
                                node.setAttribute(attribute, a.mixString(b, dt));
                            }
                        );
                    } else if (
                        ["move", "fade-in", "fade-out", "appear-along", "draw-line", "class", "stage"].includes(
                            attribute
                        )
                    ) {
                        // Nothing to do
                    } else {
                        console.error(
                            `Don't know how to handle transitions for attribute '${attribute}' (from ${currentValue} to ${nextValue}), node ${node.id}`
                        );
                    }
                }
            }
        }

        // Entry effect: fade-in
        for (let node of nextStep.dom.querySelectorAll("[fade-in]")) {
            const ghostNode = this._insertGhostNode(node);
            ghostNode.style.opacity = 0.0;
            this._addTransition(
                this._getTransitionDuration(node, "fade-in"),
                this._getTransitionAlignment(node, "fade-in"),
                "easeInCubic",
                dt => {
                    ghostNode.style.opacity = linearMix(0.0, node.style.opacity || 1.0, dt);
                }
            );
        }

        // Entry effect: fade-down
        for (let node of nextStep.dom.querySelectorAll("[fade-down]")) {
            const ghostNode = this._insertGhostNode(node);
            ghostNode.style.opacity = 0.0;
            const originalTransform = ghostNode.getAttribute("transform") || "";
            this._addTransition(
                this._getTransitionDuration(node, "fade-down"),
                this._getTransitionAlignment(node, "fade-down"),
                "easeInSin",
                dt => {
                    ghostNode.style.opacity = linearMix(0.0, node.style.opacity || 1.0, dt);
                    const offset = linearMix(-20, 0, dt);
                    ghostNode.setAttribute("transform", `${originalTransform} translate(0,${offset})`);
                }
            );
        }

        // Entry effect of paths: appear by drawing the line from the beginning
        for (let node of nextStep.dom.querySelectorAll("[draw-line]")) {
            const length = node.getTotalLength();
            const ghostNode = this._insertGhostNode(node);
            ghostNode.style.strokeDasharray = length;
            ghostNode.style.strokeDashoffset = length;
            this._addTransition(
                this._getTransitionDuration(node, "draw-line"),
                this._getTransitionAlignment(node, "draw-line"),
                "easeInOutQuad",
                dt => {
                    ghostNode.style.strokeDashoffset = linearMix(length, 0.0, dt);
                }
            );
        }

        // Entry-effect for objects: appear along a trajectory given by a referenced path
        // [appear-along=MyPath,1] (for 1 second)
        for (let node of nextStep.dom.querySelectorAll("[appear-along]")) {
            const pathId = node.getAttribute("appear-along").split(",", 1)[0];
            const path = snap(nextStep.dom.getElementById(pathId));
            const totalPathLength = path.getTotalLength();
            const endpoint = path.getPointAtLength(totalPathLength);
            const angleAtEndpoint = getAngleAtPath(path, 1.0, totalPathLength);
            const originalTransform = node.getAttribute("transform") || "";

            const ghostNode = this._insertGhostNode(node);

            this._addTransition(
                this._getTransitionDuration(node, "appear-along"),
                this._getTransitionAlignment(node, "appear-along"),
                "easeInOutQuad",
                dt => {
                    ghostNode.setAttribute("opacity", dt > 0 ? 1 : 0);
                    const pos = path.getPointAtLength(dt * totalPathLength);
                    pos.x -= endpoint.x;
                    pos.y -= endpoint.y;
                    const angle = getAngleAtPath(path, dt, totalPathLength) - angleAtEndpoint;
                    const transform = `${originalTransform} translate(${pos.x}, ${pos.y}) rotate(${angle}, ${endpoint.x}, ${endpoint.y})`;
                    ghostNode.setAttribute("transform", transform);
                }
            );
        }

        // Exit effect: fade-out
        for (let node of this.dom.querySelectorAll("[fade-out]")) {
            const startOpacity = node.style.opacity || 1.0;
            this._addTransition(
                this._getTransitionDuration(node, "fade-out"),
                this._getTransitionAlignment(node, "fade-out"),
                "easeOutCubic",
                dt => {
                    node.style.opacity = linearMix(startOpacity, 0.0, dt);
                }
            );
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
            transition(easing[easeFn](Math.min(1, Math.max(0, (t * this.duration() - startOffset) / duration))));
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
     * @param {"fade-in"|"fade-out"|"move"|"appear-along"|"draw-line"} transition
     */
    _getTransitionDuration(node, transition) {
        const attr = (node.getAttribute(transition) || "").split(",");
        let durationValue;
        if (transition !== "appear-along") {
            durationValue = attr[0];
        } else {
            durationValue = attr[1];
        }
        const userValue = parseFloat(durationValue);
        if (isFinite(userValue)) {
            // not empty
            return userValue;
        } else {
            return DEFAULT_TRANSITION_TIMES[transition];
        }
    }

    /**
     * Read transition alignment from an SVG element or resort to the default
     * @param {HTMLElement} node
     * @param {"fade-in"|"fade-out"|"move"|"appear-along"|"draw-line"} transition
     */
    _getTransitionAlignment(node, transition) {
        const attr = (node.getAttribute(transition) || "").split(",");
        let alignmentValue;
        if (transition !== "appear-along") {
            alignmentValue = attr[1];
        } else {
            alignmentValue = attr[2];
        }
        const userValue = parseFloat(alignmentValue);
        if (isFinite(userValue)) {
            // not empty
            return userValue;
        } else {
            return DEFAULT_TRANSITION_ALIGNMENT[transition];
        }
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
        }
        return correspondingParent;
    }

    /**
     * Insert a ghost element in our dom tree that is supposed to appear on the next slide
     * We are careful about positioning to get occlusions right.
     * @param {HTMLELement} node from another dom tree
     */
    _insertGhostNode(node) {
        const correspondingParent = this._findCorrespondingParent(node, this.dom);
        const ghostNode = node.cloneNode(true);
        const referenceNode = this._nextStayingChild(node);
        if (referenceNode != null) {
            const refId = referenceNode.getAttribute("id");
            const refNodeInDom = this.index.nodeByIdentifier(refId);
            correspondingParent.insertBefore(ghostNode, refNodeInDom);
        } else {
            correspondingParent.appendChild(ghostNode);
        }
        return ghostNode;
    }

    /**
     * Utility used by insertGhostNode to find the next node that
     * 'matters' in terms of occlusions for ghost nodes.
     * @param {HTMLElement} node
     */
    _nextStayingChild(node) {
        let it = node.nextElementSibling;
        while (it != null) {
            if (it.hasAttribute("move")) {
                return it;
            }
            it = it.nextElementSibling;
        }
    }
}

/**
 * Index so you can quickly find DOM elements by their ID
 * if they have the `[move]` attribute
 */
class MoveElementIndex {
    /**
     * @param {HTMLElement} dom
     */
    constructor(dom) {
        this.dom = dom;
        this._buildIndex();
    }
    /**
     * Quickly find a dom node in this stage by ID
     * Used to match `move`ing nodes between stages
     * @param {string} identifier
     */
    nodeByIdentifier(identifier) {
        return this.index[identifier];
    }

    _buildIndex() {
        this.index = {};
        this.dom.querySelectorAll("[move]").forEach(node => {
            this.index[node.getAttribute("id")] = node;
        });
    }
}
