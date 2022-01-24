export type SlideSpec = { id: string, content: string};
type StepInfo = {
    slide: SlideInfo,
    localIndex: number,
    globalIndex: number,
    step: Step
};
type SlideInfo = { id: string, index: number, steps: StepInfo[]};
export type DomPlugin = (HTMLElement) => void;

/**
 * This parses and pre-processes a slide deck
 * It holds one SVG Element for each 'build stage'
 * in each slide.
 * Also handles translation between stage number / slide number, etc.
 */
export default class SlideDeck {
    slides: SlideInfo[];
    private steps: StepInfo[];
    height: number;
    width: number;
    scriptStarts: {[script: string]: number};

    constructor(slideList: SlideSpec[], plugins: DomPlugin[] = []) {
        this.slides = [];
        this.steps = [];

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
                this.steps.push(step);
                stepIndex += 1;
            }
            this.slides.push(slide);
            slideIndex += 1;
        }

        this.width = this.step(0).width;
        this.height = this.step(0).height;

        // Store first step numbers in which a `scripted` node appears
        this.scriptStarts = {};
        for (let i = 0; i < this.numSteps(); ++i) {
            for (let script of Object.keys(this.step(i).scriptNodes)) {
                if (Object.keys(this.scriptStarts).indexOf(script) === -1) {
                    this.scriptStarts[script] = i;
                }
            }
        }
    }

    step(i: number) {
        if (i >= this.numSteps()) return null;
        return this.steps[i].step;
    }

    /**
     * @param {number} position possibly in between two stages
     */
    nextSlideIndex(position: number) {
        const step = this.steps[Math.floor(position)];
        const nextIndex = Math.min(this.numSlides() - 1, step.slide.index + 1);
        const nextSlide = this.slides[nextIndex];
        return last(nextSlide.steps).globalIndex;
    }

    /**
     * @param {number} position possibly in between two stages
     */
    slideNumber(position: number) {
        const step = this.steps[Math.floor(position)];
        return step.slide.index + 1;
    }

    /**
     * @param {number} slideNumber integer
     */
    firstStageForSlide(slideNumber: number) {
        const slide = this.slides[slideNumber - 1];
        return slide.steps[0].globalIndex;
    }

    numSteps() {
        return this.steps.length;
    }

    numSlides() {
        return this.slides.length;
    }

    lastSlideNumber() {
        return this.numSlides();
    }

    stageId(position: number) {
        const step = this.steps[Math.ceil(position)];
        return `${this.slideId(position)} ${step.localIndex}`;
    }

    slideId(position: number) {
        const step = this.steps[Math.ceil(position)];
        return step.slide.id;
    }

    /**
     * @param {integer} position possibly in between two stages
     */
    prevSlideIndex(position: number) {
        const step = this.steps[Math.floor(position)];
        const prevIndex = Math.max(0, step.slide.index - 1);
        const prevSlide = this.slides[prevIndex];
        return last(prevSlide.steps).globalIndex;
    }
}

/**
 * A 'Slide' can consist of multiple 'steps'.
 * This hold one such step.
 */
export class Step {
    height: number;
    width: number;
    scriptNodes: {[script: string]: string};
    dom: HTMLElement;
    isFirst: boolean;
    isLast: boolean;
    stage: number;
    private lastStage: number;

    constructor(dom: SVGElement, stage: number) {
        this.dom = dom.cloneNode(true) as HTMLElement;
        this.lastStage = maxStage(this.dom);
        this.isFirst = stage === 0;
        this.stage = stage;
        this.isLast = stage === this.lastStage;
        this.height = parseFloat(this.dom.getAttribute("height"));
        this.width = parseFloat(this.dom.getAttribute("width"));
        this.adaptDomToStage(this.dom, stage);

        this.scriptNodes = {};
        for (let node of this.dom.querySelectorAll("[script]")) {
            if (this.dom.querySelector(`#${node.id}`) !== node) {
                console.error(`Node ID ${node.id} is not unique. This is important for the script.`);
            }
            this.scriptNodes[node.getAttribute("script")] = node.id;
        }
    }

    /**
     * Update a DOM tree to represent a chosen 'stage' for 'incremental builds'.
     * Removes nodes that should not be visible
     * @param {HTMLElement} domNode base dom node that is adapted (pre-cloned)
     * @param {number} stageNumber number of the stage that is currently created
     */
    private adaptDomToStage(domNode: HTMLElement, stageNumber: number) {
        for (let node of domNode.querySelectorAll("[stage]")) {
            const [minStage, maxStage] = getVisibleStages(node as HTMLElement, this.lastStage);
            if (stageNumber < minStage || stageNumber > maxStage) {
                node.parentElement.removeChild(node);
            } else {
                node.removeAttribute("stage");
                node.setAttribute("min-stage", minStage.toString());
                node.setAttribute("max-stage", maxStage.toString());
                this.adaptDomToStage(node as HTMLElement, stageNumber);
            }
        }
    }
}

/**
 * Read visible stage information from a node
 * `[stage=4]`: from stage 4
 * `[stage=2-5]`: from stage 2 up to and including stage 5
 */
function getVisibleStages(node: HTMLElement, lastStage: number) {
    const stageList = (node.getAttribute("stage") || "").split("-");
    const min = parseFloat(stageList[0] || "0");
    const max = parseFloat(stageList[1] || lastStage.toString());
    return [min, max];
}

/**
 * Find the largest stage number encountered in a node's descendant's attributes
 *
 * @param {HTMLElement} domNode
 * @returns {number}
 */
export function maxStage(domNode: SVGElement | HTMLElement) {
    let max = 0;
    for (let node of domNode.querySelectorAll("[stage]")) {
        let [minStage, maxStage] = getVisibleStages(node as HTMLElement, -1);
        if (maxStage == -1) maxStage = minStage;
        max = Math.max(max, maxStage);
    }
    return max;
}

/**
 * Get the last element of the array.
 * Like `array[-1]` in Python
 */
function last(array: any[]) {
    return array[array.length - 1];
}
