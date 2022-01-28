import { linearMix } from "../utils";
import { parseTransitionDuration, parseTransitionAlignment } from "./utils";

export const attribute = "fade-out";

export function create(node: HTMLElement) {
    const startOpacity = parseFloat(node.style.opacity) || 1.0;
    return [{
        duration: parseTransitionDuration(node, "fade-out", 0.5),
        alignment: parseTransitionAlignment(node, "fade-out", 0.0),
        mode: "easeOutCubic",
        callback: dt => {
            node.style.opacity = linearMix(startOpacity, 0.0, dt);
        }
    }]
};
