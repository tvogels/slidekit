import easing from "./utils/easing";

import SlideDeck, { Step } from "./slidedeck"
import Canvas from "./canvas"
import { isEntering, isExiting, Transition, insertGhostNode } from "./transitions/utils";
import { defaultEnterTransitions, defaultExitTransitions } from "./transitions"

type Script = {
    name?: string,
    setNode: (node: HTMLElement) => void,
    deactivate?: () => void,
    tick: (dt: number) => void,
    minimumDuration?: (t: number) => number,
};

export type ScriptTemplate = (context: { canvas: HTMLDivElement, width: number, height: number, node: HTMLElement }) => Script;

export type ExitTransitionSpec = {
    attribute: string,
    create: (node: HTMLElement, stage: Stage, nextStage: Stage) => Transition[]
}

export type EnterTransitionSpec = {
    attribute: string,
    create: (node: HTMLElement, ghostNode: HTMLElement, stage: Stage, nextStage: Stage) => Transition[]
}

type Callback = (number) => void;

/**
 * This is responsible for rendering a current position in the slideshow
 * to a canvas. It holds 'stages' which are responsible for a 'step' and
 * the transition to the next 'step'.
 */
export default class SlidePlayer {
    private visibleStage?: number = null;
    private stages: Stage[];

    private scripts: { [script: string]: Script } = {};
    private activeScriptsAtStage: { [stage: number]: Set<string> } = {};
    private scriptFirstOccurrence: { [script: string]: number } = {};
    private scriptNodes: { [scriptAndStage: string]: HTMLElement } = {};

    constructor(
        public canvas: Canvas, 
        private deck: SlideDeck, 
        scripts: { [name: string]: ScriptTemplate } | undefined,
        private exitTransitions: ExitTransitionSpec[] = defaultExitTransitions,
        private enterTransitions: EnterTransitionSpec[] = defaultEnterTransitions,
    ) {
        this.stages = deck.steps.map(step => new Stage(step));

        this.instantiateTransitions();

        if (scripts != null) {
            this.instantiateScripts(scripts);
        }
    }

    render(t: number) {
        const i = Math.floor(t);
        this.stages[i].render(t - Math.floor(t));
        for (let script of this.activeScriptsAtStage[i] || []) {
            this.scripts[script].tick(t - this.scriptFirstOccurrence[script]);
        }
        if (i != this.visibleStage) {
            this.switchStage(i);
        }
    }

    stageDuration(stage: number) {
        return this.stages[stage].duration();
    }

    private switchStage(i: number) {
        for (let script of this.activeScriptsAtStage[this.visibleStage] || []) {
            if (!this.activeScriptsAtStage[i].has(script)) {
                this.scripts[script].deactivate();
            }
        }
        this.visibleStage = i;
        for (let script of this.activeScriptsAtStage[i] || []) {
            this.scripts[script].setNode(this.scriptNodes[`${script}/${i}`]);
        }
        this.stages[i].activate(this.canvas);
        this.renderSlideNumber(i);
    }

    private instantiateTransitions() {
        for (let stageNumber = 0; stageNumber < this.stages.length - 1; ++stageNumber) {
            const stage = this.stages[stageNumber];
            const nextStage = this.stages[stageNumber + 1];

            // Exit transitions
            for (let node of stage.dom.querySelectorAll("*")) {
                if (isExiting(node, stage.step)) {
                    for (let spec of this.exitTransitions) {
                        if (node.hasAttribute(spec.attribute)) {
                            spec.create(node as HTMLElement, stage, nextStage).forEach(stage.addTransition);
                        }
                    }
                }
            }

            // Enter transitions
            for (let node of nextStage.dom.querySelectorAll("*")) {
                if (isEntering(node, nextStage.step)) {
                    let ghostNode = null;
                    for (let spec of this.enterTransitions) {
                        if (node.hasAttribute(spec.attribute)) {
                            if (ghostNode == null) {
                                ghostNode = insertGhostNode(node as HTMLElement, stage.dom);
                            }
                            spec.create(node as HTMLElement, ghostNode, stage, nextStage).forEach(stage.addTransition);
                        }
                    }
                }
            }
        }
    }

    private instantiateScripts(scriptTemplates: { [name: string]: ScriptTemplate }) {
        this.scripts = {};
        this.activeScriptsAtStage = {};
        for (let stageNumber = 0; stageNumber < this.stages.length; ++stageNumber) {
            this.activeScriptsAtStage[stageNumber] = new Set();
            const stage = this.stages[stageNumber];
            for (let scriptNode of stage.dom.querySelectorAll("[script]")) {
                const nodeId = scriptNode.id;
                const scriptName = scriptNode.getAttribute("script");
                const identifier = `${scriptName}/${nodeId}`;
                const template = scriptTemplates[scriptName];
                if (template == null) {
                    console.error(`Missing script definition ${scriptName} requested by node ${nodeId} at stage ${stageNumber}.`);
                    continue;
                }
                if (this.scripts[identifier] == null) {
                    const context = { canvas: this.canvas.canvas, width: this.deck.width, height: this.deck.height, node: scriptNode };
                    this.scripts[identifier] = { minimumDuration: () => 0, deactivate: () => null, name: identifier, ...template(context) }
                    this.scriptFirstOccurrence[identifier] = stageNumber;
                }
                this.activeScriptsAtStage[stageNumber].add(identifier);
                this.scriptNodes[`${scriptName}/${nodeId}/${stageNumber}`] = scriptNode as HTMLElement;
                stage.reportTransitionDuration(this.scripts[identifier].minimumDuration(stageNumber - this.scriptFirstOccurrence[identifier]));
            }
        }
    }

    private renderSlideNumber(t: number) {
        const number = this.deck.slideNumber(t);
        const total = this.deck.lastSlideNumber();
        this.canvas.setSlideNumber(`${number} / ${total}`);
    }
}

/**
 * A 'stage' represents the time between a step and the next step.
 * So it can also render intermediate values.
 * It basically defines the transition
 */
export class Stage {
    dom: HTMLElement
    scriptInstances: { script: string, node: string }[]
    private transitions: Callback[]
    private transitionDuration: number

    constructor(public step: Step) {
        this.dom = step.makeDom();
        this.transitions = [];
        this.transitionDuration = 0;
        this.addTransition = this.addTransition.bind(this);
    }

    activate(canvas: Canvas) {
        canvas.setSvg(this.dom);
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

    addTransition({ duration, alignment, mode, callback }: Transition) {
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

export function scriptId(script: string, node: string) {
    return `${script}/${node}`;
}
