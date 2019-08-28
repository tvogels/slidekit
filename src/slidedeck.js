import { maxStage } from "./utils";

/**
 * This parses and pre-processes a slide deck
 * It holds one SVG Element for each 'build stage'
 * in each slide.
 * Also handles translation between stage number / slide number, etc.
 */
export default class SlideDeck {
    /**
     * @param {string[]} slideStrings
     */
    constructor(slideStrings) {
        this.slideStrings = slideStrings;
        this.steps = [];
        this.slideStartIndices = [];
        this.slideEndIndices = [];
        this.slideNumbers = [];
        let i = 0;
        let slideNumber = 0;
        for (let slideString of slideStrings) {
            slideNumber += 1;
            this.slideStartIndices.push(i);
            const html = document.createElement("html");
            html.innerHTML = slideString;
            const svg = html.querySelector("svg");
            preprocessSlide(svg);
            const lastStage = maxStage(svg);
            for (let stage = 0; stage <= lastStage; stage++) {
                this.steps.push(new Step(svg, stage));
                i += 1;
                this.slideNumbers.push(slideNumber);
            }
            this.slideEndIndices.push(i - 1);
        }
    }

    /**
     * @param {number} position possibly in between two stages
     */
    nextSlideIndex(position) {
        return this.slideEndIndices.find(s => s > position);
    }

    /**
     * @param {number} position possibly in between two stages
     */
    slideNumber(position) {
        return this.slideNumbers[Math.floor(position)];
    }

    /**
     * @param {number} slideNumber integer
     */
    firstStageForSlide(slideNumber) {
        return this.slideNumbers.findIndex(x => x === slideNumber) || 0;
    }

    lastSlideNumber() {
        return this.slideNumbers[this.slideNumbers.length - 1];
    }

    numSteps() {
        return this.steps.length;
    }

    /**
     * @param {integer} position possibly in between two stages
     */
    prevSlideIndex(position) {
        // .reverse() is in-place, and we don't want to modify the original array,
        // so hence the [...] to copy
        return [...this.slideEndIndices].reverse().find(s => s < position);
    }
}

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
        this._adaptDomToStage(this.dom, stage, lastStage);
    }

    /**
     * Update a DOM tree to represent a chosen 'stage' for 'incremental builds'.
     * Removes nodes that should not be visible and sets 'fade-in' and 'fade-out' transitions correctly.
     * @param {HTMLElement} domNode base dom node that is adapted (pre-cloned)
     * @param {number} stageNumber number of the stage that is currently created
     * @param {number} lastStage of the slide (number of stages - 1)
     */
    _adaptDomToStage(domNode, stageNumber, lastStage) {
        for (let node of domNode.querySelectorAll("[stage]")) {
            const nodeStage = node.getAttribute("stage") || 0;
            if (nodeStage > stageNumber) {
                window.temp = node;
                node.parentElement.removeChild(node);
            } else {
                this._adaptDomToStage(node, stageNumber, lastStage);
            }
            node.removeAttribute("stage");
        }

        // Entry transitions
        // should only happen when they appear
        for (let node of domNode.querySelectorAll("[fade-in]")) {
            const nodeStage = node.getAttribute("stage") || 0;
            if (nodeStage !== stageNumber) {
                node.removeAttribute("fade-in");
            }
        }
        for (let node of domNode.querySelectorAll("[draw-line]")) {
            const nodeStage = node.getAttribute("stage") || 0;
            if (nodeStage !== stageNumber) {
                node.removeAttribute("draw-line");
            }
        }
        for (let node of domNode.querySelectorAll("[appear-along]")) {
            const nodeStage = node.getAttribute("stage") || 0;
            if (nodeStage !== stageNumber) {
                node.removeAttribute("appear-along");
            }
        }

        // Exit transitions
        // should only happen when the node disappears
        for (let node of domNode.querySelectorAll("[fade-out]")) {
            if (stageNumber !== lastStage) {
                node.removeAttribute("fade-out");
            }
        }
    }
}

/**
 * This is an experiment with preprocessing operations that are done on the SVGs
 * You can add your own extensions here.
 * @param {HTMLElement} domNode
 */
function preprocessSlide(domNode) {
    // Scale
    for (let node of domNode.querySelectorAll("[scale]")) {
        // This is not a good place for this. Should be done in pre-processing (Python) probably
        const scale = node.getAttribute("scale");
        node.setAttribute("transform", node.getAttribute("transform") + " " + `scale(${scale})`);
        node.removeAttribute("scale");
    }

    // YouTube
    for (let node of domNode.querySelectorAll("[youtube]")) {
        domNode.setAttribute("xmlns:xhtml", "http://www.w3.org/1999/xhtml");
        // This is not a good place for this. Should be done in pre-processing (Python) probably
        const id = node.getAttribute("youtube");

        const foreignObject = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
        foreignObject.setAttribute("x", node.getAttribute("x"));
        foreignObject.setAttribute("y", node.getAttribute("y"));
        foreignObject.setAttribute("height", node.getAttribute("height"));
        foreignObject.setAttribute("width", node.getAttribute("width"));

        const parent = node.parentElement;
        parent.insertBefore(foreignObject, node);
        parent.removeChild(node);

        foreignObject.innerHTML = `<iframe width="${node.getAttribute("width")}" height="${node.getAttribute(
            "height"
        )}" src="https://www.youtube.com/embed/${id}" frameborder="0" allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>`;
    }
}
