export type SlideSpec = { id: string, content: string };

export type Step = {
    slide: Slide,
    numberWithinSlide: number,
    number: number,
    makeDom: () => HTMLElement,
};

export type Slide = { id: string, number: number, steps: Step[], width: number, height: number };

export type DomPlugin = (HTMLElement) => void;

/**
 * This parses and pre-processes a slide deck
 * It holds one SVG Element for each 'build stage'
 * in each slide.
 * Also handles translation between stage number / slide number, etc.
 */
export default class SlideDeck {
    slides: Slide[];
    steps: Step[];
    height: number;
    width: number;

    constructor(slideList: SlideSpec[], plugins: DomPlugin[] = []) {
        this.slides = [];
        this.steps = [];

        let slideNumber = 0;
        let stageNumber = 0;

        for (let { content, id } of slideList) {
            const svg = svgStringToDom(content);

            for (let plugin of plugins) {
                plugin(svg);
            }

            const slide: Slide = {
                id,
                number: slideNumber, // starting at 0 ...
                steps: [],
                width: parseFloat(svg.getAttribute("width")),
                height: parseFloat(svg.getAttribute("height")),
            };
            this.slides.push(slide);

            const lastStage = maxStage(svg);
            for (let stageOfSlide = 0; stageOfSlide <= lastStage; stageOfSlide++) {
                const step: Step = {
                    slide,
                    numberWithinSlide: stageOfSlide,
                    number: stageNumber,
                    makeDom: () => adaptDomToStage(svg.cloneNode(true) as HTMLElement, stageOfSlide, lastStage)
                };
                slide.steps.push(step);
                this.steps.push(step);
                stageNumber += 1;
            }
            slideNumber += 1;
        }

        this.width = this.slides[0].width;
        this.height = this.slides[0].height;
    }

    step(i: number): Step | undefined {
        if (i >= this.numSteps()) return null;
        return this.steps[i];
    }

    /**
     * @param {number} position possibly in between two stages
     */
    nextSlideIndex(position: number) {
        const step = this.steps[Math.floor(position)];
        const nextIndex = Math.min(this.numSlides() - 1, step.slide.number + 1);
        const nextSlide = this.slides[nextIndex];
        return last(nextSlide.steps).globalIndex;
    }

    /**
     * @param {number} position possibly in between two stages
     */
    slideNumber(position: number) {
        const step = this.steps[Math.floor(position)];
        return step.slide.number + 1;
    }

    /**
     * @param {number} slideNumber integer
     */
    firstStageForSlide(slideNumber: number) {
        const slide = this.slides[slideNumber - 1];
        return slide.steps[0].number;
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
        return `${this.slideId(position)} ${step.numberWithinSlide}`;
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
        const prevIndex = Math.max(0, step.slide.number - 1);
        const prevSlide = this.slides[prevIndex];
        return last(prevSlide.steps).globalIndex;
    }
}

/**
 * Update a DOM tree to represent a chosen 'stage' for 'incremental builds'.
 * Removes nodes that should not be visible
 * @param {HTMLElement} domNode base dom node that is adapted (pre-cloned)
 * @param {number} stageNumber number of the stage that is currently created
 */
function adaptDomToStage(domNode: HTMLElement, stageNumber: number, lastStage: number) {
    for (let node of domNode.querySelectorAll("[stage]")) {
        const [minStage, maxStage] = getVisibleStages(node as HTMLElement, lastStage);
        if (stageNumber < minStage || stageNumber > maxStage) {
            node.parentElement.removeChild(node);
        } else {
            node.removeAttribute("stage");
            node.setAttribute("min-stage", minStage.toString());
            node.setAttribute("max-stage", maxStage.toString());
            adaptDomToStage(node as HTMLElement, stageNumber);
        }
    }
    return domNode;
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


function svgStringToDom(string) {
    const html = document.createElement("html");
    html.innerHTML = `${string}`;
    return html.querySelector("svg") as any as HTMLElement;
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
