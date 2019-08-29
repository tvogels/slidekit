/**
 * This parses and pre-processes a slide deck
 * It holds one SVG Element for each 'build stage'
 * in each slide.
 * Also handles translation between stage number / slide number, etc.
 */
export default class SlideDeck {
    /**
     * @param {string[]} slideStrings
     * @param {((HTMLElement) => void)[]?} plugins
     */
    constructor(slideStrings, plugins = []) {
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
            for (let plugin of plugins) {
                plugin(svg);
            }
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
        this.lastStage = maxStage(this.dom);
        this.isFirst = stage === 0;
        this.isLast = stage === this.lastStage;
        this._adaptDomToStage(this.dom, stage);
    }

    /**
     * Update a DOM tree to represent a chosen 'stage' for 'incremental builds'.
     * Removes nodes that should not be visible and sets 'fade-in' and 'fade-out' transitions correctly.
     * @param {HTMLElement} domNode base dom node that is adapted (pre-cloned)
     * @param {number} stageNumber number of the stage that is currently created
     * @param {number} lastStage of the slide (number of stages - 1)
     */
    _adaptDomToStage(domNode, stageNumber) {
        for (let node of domNode.querySelectorAll("[stage]")) {
            const [minStage, maxStage] = getVisibleStages(node, this.lastStage);
            if (stageNumber < minStage || stageNumber > maxStage) {
                node.parentElement.removeChild(node);
            } else {
                this._adaptDomToStage(node, stageNumber);
            }
        }

        // Entry transitions
        // should only happen when they appear
        for (let node of domNode.querySelectorAll("[fade-in]")) {
            const [minStage, maxStage] = getVisibleStages(node, this.lastStage);
            if (stageNumber !== minStage) {
                node.removeAttribute("fade-in");
            }
        }
        for (let node of domNode.querySelectorAll("[draw-line]")) {
            const [minStage, _] = getVisibleStages(node, this.lastStage);
            if (stageNumber !== minStage) {
                node.removeAttribute("draw-line");
            }
        }
        for (let node of domNode.querySelectorAll("[appear-along]")) {
            const [minStage, _] = getVisibleStages(node, this.lastStage);
            if (stageNumber !== minStage) {
                node.removeAttribute("appear-along");
            }
        }

        // Exit transitions
        // should only happen when the node disappears
        for (let node of domNode.querySelectorAll("[fade-out]")) {
            const [_, maxStage] = getVisibleStages(node, this.lastStage);
            if (stageNumber !== maxStage) {
                node.removeAttribute("fade-out");
            }
        }
    }
}

/**
 * Read visible stage information from a node
 * `[stage=4]`: from stage 4
 * `[stage=2-5]`: from stage 2 up to and including stage 5
 * @param {HTMLElement} node
 * @param {number} lastStage
 */
function getVisibleStages(node, lastStage) {
    const stageList = (node.getAttribute("stage") || "").split("-");
    const min = parseFloat(stageList[0] || 0);
    const max = parseFloat(stageList[1] || lastStage);
    return [min, max];
}

/**
 * Find the largest stage number encountered in a node's descendant's attributes
 *
 * @param {HTMLElement} domNode
 * @returns {number}
 */
export function maxStage(domNode) {
    let max = 0;
    for (let node of domNode.querySelectorAll("[stage]")) {
        let [minStage, maxStage] = getVisibleStages(node, -1);
        if (maxStage == -1) maxStage = minStage;
        max = Math.max(max, maxStage);
    }
    return max;
}
