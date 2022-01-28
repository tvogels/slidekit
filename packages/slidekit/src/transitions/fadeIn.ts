import { linearMix } from "../utils";
import { parseTransitionDuration, parseTransitionAlignment } from "./utils";

export const attribute = "fade-in";

export function create(node: HTMLElement, ghostNode: HTMLElement) {
    const targetOpacity = parseFloat(node.getAttribute("opacity")) || 1.0;
    return [{
        duration: parseTransitionDuration(node, "fade-in", 0.5, "enter"),
        alignment: parseTransitionAlignment(node, "fade-in", 1.0, "enter"),
        mode: "easeInCubic",
        callback: dt => {
            ghostNode.style.opacity = linearMix(0.0, targetOpacity, dt);
        }
    }]
};
