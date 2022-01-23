import { linearMix } from "../utils";
import {Step} from "../slidedeck";
import {isEntering, Transition, insertGhostNode} from "./utils";

const DEFAULT_TRANSITION_TIME = 0.5;
const DEFAULT_TRANSITION_ALIGNMENT = 1.0; // end of the transition

function transitionDuration(node: Element) {
    if (node.hasAttribute("duration")) {
        return parseFloat(node.getAttribute("duration"));
    }
    const attr = (node.getAttribute("fade-in") || "").split(",");
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
    const attr = (node.getAttribute("fade-in") || "").split(",");
    const userValue = parseFloat(attr[1]);
    if (isFinite(userValue)) {
        return userValue;
    } else {
        return DEFAULT_TRANSITION_ALIGNMENT;
    }
}

export default function (dom: HTMLElement, step: Step, nextStep: Step): Transition[] {
    const transitions: Transition[] = [];
    for (let node of [...nextStep.dom.querySelectorAll("[fade-in]")].reverse()) {
        if (!isEntering(node, nextStep)) continue;
        const ghostNode = insertGhostNode(node, dom);
        ghostNode.style.opacity = "0.001";
        const targetOpacity = parseFloat(node.getAttribute("opacity")) || 1.0;
        transitions.push({
            duration: transitionDuration(node),
            alignment: transitionAlignment(node),
            mode: "easeInCubic",
            callback: dt => {
                ghostNode.style.opacity = linearMix(0.0, targetOpacity, dt);
            }
        });
    }
    return transitions;
}
