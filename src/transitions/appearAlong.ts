import snap from "snapsvg";
import { Step } from "../slidedeck";
import { isEntering, Transition, insertGhostNode } from "./utils";
import { getAngleAtPath } from "../utils";

const DEFAULT_TRANSITION_TIME = 0.5;
const DEFAULT_TRANSITION_ALIGNMENT = 1.0; // end of the transition

function transitionDuration(node: Element) {
    const attr = (node.getAttribute("appear-along") || "").split(",");
    const userValue = parseFloat(attr[0]);
    if (isFinite(userValue)) {
        return userValue;
    } else {
        return DEFAULT_TRANSITION_TIME;
    }
}

function transitionAlignment(node: Element) {
    const attr = (node.getAttribute("appear-along") || "").split(",");
    const userValue = parseFloat(attr[1]);
    if (isFinite(userValue)) {
        return userValue;
    } else {
        return DEFAULT_TRANSITION_ALIGNMENT;
    }
}

export default function (dom: HTMLElement, step: Step, nextStep: Step): Transition[] {
    const transitions: Transition[] = [];
    // Entry-effect for objects: appear along a trajectory given by a referenced path
    // [appear-along=MyPath,1] (for 1 second)
    for (let node of [...nextStep.dom.querySelectorAll("[appear-along]")].reverse()) {
        if (!isEntering(node, nextStep)) continue;
        const pathId = node.getAttribute("appear-along").split(",", 1)[0];
        const path = snap(nextStep.dom.getElementById(pathId));
        const totalPathLength = path.getTotalLength();
        const endpoint = path.getPointAtLength(totalPathLength);
        const angleAtEndpoint = getAngleAtPath(path, 1.0, totalPathLength);
        const originalTransform = node.getAttribute("transform") || "";

        const ghostNode = insertGhostNode(node, dom);

        transitions.push({
            duration: transitionDuration(node),
            alignment: transitionAlignment(node),
            mode: "easeInOutQuad",
            callback: dt => {
                ghostNode.setAttribute("opacity", dt > 0 ? "1" : "0");
                const pos = path.getPointAtLength(dt * totalPathLength);
                pos.x -= endpoint.x;
                pos.y -= endpoint.y;
                const angle = getAngleAtPath(path, dt, totalPathLength) - angleAtEndpoint;
                const transform = `${originalTransform} translate(${pos.x}, ${pos.y}) rotate(${angle}, ${endpoint.x}, ${endpoint.y})`;
                ghostNode.setAttribute("transform", transform);
            }
        });
    }
    return transitions;
}
