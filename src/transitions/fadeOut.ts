import { linearMix } from "../utils";
import {Step} from "../slidedeck";
import {isExiting, Transition} from "./utils";

const DEFAULT_TRANSITION_TIME = 0.5;
const DEFAULT_TRANSITION_ALIGNMENT = 0.0; // beginning of the transition

function transitionDuration(node: Element) {
    if (node.hasAttribute("duration")) {
        return parseFloat(node.getAttribute("duration"));
    }
    const attr = (node.getAttribute("fade-out") || "").split(",");
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
    const attr = (node.getAttribute("fade-out") || "").split(",");
    const userValue = parseFloat(attr[1]);
    if (isFinite(userValue)) {
        return userValue;
    } else {
        return DEFAULT_TRANSITION_ALIGNMENT;
    }
}

export default function (dom: HTMLElement, step: Step, nextStep: Step): Transition[] {
    const transitions = [];
    for (let node of dom.querySelectorAll("[fade-out]")) {
        if (!isExiting(node, step)) continue;
        const htmlNode = node as HTMLElement;
        const startOpacity = parseFloat(htmlNode.style.opacity) || 1.0;
        transitions.push({
            duration: transitionDuration(node),
            alignment: transitionAlignment(node),
            mode: "easeOutCubic",
            callback: dt => {
                htmlNode.style.opacity = linearMix(startOpacity, 0.0, dt);
            }
        });
    }
    return transitions;
}
