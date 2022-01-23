import { linearMix } from "../utils";
import { Step } from "../slidedeck";
import { isEntering, Transition, insertGhostNode } from "./utils";

const DEFAULT_TRANSITION_TIME = 0.5;
const DEFAULT_TRANSITION_ALIGNMENT = 1.0; // end of the transition

function transitionDuration(node: Element) {
    if (node.hasAttribute("duration")) {
        return parseFloat(node.getAttribute("duration"));
    }
    const attr = (node.getAttribute("draw-line") || "").split(",");
    const userValue = parseFloat(attr[0]);
    if (isFinite(userValue)) {
        return userValue;
    } else {
        return DEFAULT_TRANSITION_TIME;
    }
}

function transitionAlignment(node: Element) {
    if (node.hasAttribute("alignment")) {
        return parseFloat(node.getAttribute("alignment"));
    }
    const attr = (node.getAttribute("draw-line") || "").split(",");
    const userValue = parseFloat(attr[1]);
    if (isFinite(userValue)) {
        return userValue;
    } else {
        return DEFAULT_TRANSITION_ALIGNMENT;
    }
}

export default function (dom: HTMLElement, step: Step, nextStep: Step): Transition[] {
    const transitions: Transition[] = [];
    for (let node of [...nextStep.dom.querySelectorAll("[draw-line]")].reverse()) {
        if (!isEntering(node, nextStep)) continue;
        const length = node.getTotalLength();
        const ghostNode = insertGhostNode(node, dom);
        ghostNode.style.strokeDasharray = length;
        ghostNode.style.strokeDashoffset = length;
        transitions.push({
            duration: transitionDuration(node),
            alignment: transitionAlignment(node),
            mode: "easeInOutQuad",
            callback: dt => {
                ghostNode.style.strokeDashoffset = linearMix(length, 0.0, dt);
            }
        });
    }
    return transitions;
}
