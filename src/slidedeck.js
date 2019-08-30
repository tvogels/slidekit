/**
 * This parses and pre-processes a slide deck
 * It holds one SVG Element for each 'build stage'
 * in each slide.
 * Also handles translation between stage number / slide number, etc.
 */
export default class SlideDeck {
    /**
     * @param {{ id: string, content: string}[]} slideList
     * @param {((HTMLElement) => void)[]?} plugins
     */
    constructor(slideList, plugins = []) {
        this._slides = [];
        this._steps = [];

        let slideIndex = 0;
        let stepIndex = 0;

        for (let { content, id } of slideList) {
            const slide = {
                index: slideIndex, // starting at 0 ...
                id,
                steps: []
            };

            const html = document.createElement("html");
            html.innerHTML = content;
            const svg = html.querySelector("svg");

            for (let plugin of plugins) {
                plugin(svg);
            }

            const lastStage = maxStage(svg);
            for (let stage = 0; stage <= lastStage; stage++) {
                const step = {
                    slide,
                    localIndex: stage,
                    globalIndex: stepIndex,
                    step: new Step(svg, stage)
                };
                slide.steps.push(step);
                this._steps.push(step);
                stepIndex += 1;
            }
            this._slides.push(slide);
            slideIndex += 1;
        }
    }

    step(i) {
        if (i >= this.numSteps()) return null;
        return this._steps[i].step;
    }

    /**
     * @param {number} position possibly in between two stages
     */
    nextSlideIndex(position) {
        const step = this._steps[Math.floor(position)];
        const nextIndex = Math.min(this.numSlides() - 1, step.slide.index + 1);
        const nextSlide = this._slides[nextIndex];
        return last(nextSlide.steps).globalIndex;
    }

    /**
     * @param {number} position possibly in between two stages
     */
    slideNumber(position) {
        const step = this._steps[Math.floor(position)];
        return step.slide.index + 1;
    }

    /**
     * @param {number} slideNumber integer
     */
    firstStageForSlide(slideNumber) {
        const slide = this._slides[slideNumber - 1];
        return slide.steps[0].globalIndex;
    }

    numSteps() {
        return this._steps.length;
    }

    numSlides() {
        return this._slides.length;
    }

    lastSlideNumber() {
        return this.numSlides();
    }

    stageId(position) {
        const step = this._steps[Math.ceil(position)];
        return `${this.slideId(position)} ${step.localIndex}`;
    }

    slideId(position) {
        const step = this._steps[Math.ceil(position)];
        return step.slide.id;
    }

    /**
     * @param {integer} position possibly in between two stages
     */
    prevSlideIndex(position) {
        const step = this._steps[Math.floor(position)];
        const prevIndex = Math.max(0, step.slide.index - 1);
        const prevSlide = this._slides[prevIndex];
        return last(prevSlide.steps).globalIndex;
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

/**
 * Get the last element of the array.
 * Like `array[-1]` in Python
 * @param {any[]} array
 */
function last(array) {
    return array[array.length - 1];
}
