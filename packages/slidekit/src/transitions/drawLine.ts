import { linearMix } from "../utils";
import { parseTransitionDuration, parseTransitionAlignment } from "./utils";

export const attribute = "draw-line";

export function create(node: HTMLElement, ghostNode: HTMLElement) {
    const length = (node as any as SVGPathElement).getTotalLength();
    ghostNode.style.strokeDasharray = length.toString();
    ghostNode.style.strokeDashoffset = length.toString();
    return [{
        duration: parseTransitionDuration(node, "draw-line", 0.5, "enter"),
        alignment: parseTransitionAlignment(node, "draw-line", 1.0, "enter"),
        mode: "easeInOutQuad",
        callback: dt => {
            ghostNode.style.strokeDashoffset = linearMix(length, 0.0, dt);
        }
    }]
};
