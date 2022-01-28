import { linearMix } from "../utils";
import { parseTransitionDuration, parseTransitionAlignment } from "./utils";

export const attribute = "fade-down";

export function create(node: HTMLElement, ghostNode: HTMLElement) {
    const originalTransform = ghostNode.getAttribute("transform") || "";
    return [{
        duration: parseTransitionDuration(node, "fade-down", 0.5, "enter"),
        alignment: parseTransitionAlignment(node, "fade-down", 1.0, "enter"),
        mode: "easeInOutQuad",
        callback: dt => {
            const offset = linearMix(-20, 0, dt);
            ghostNode.setAttribute("transform", `${originalTransform} translate(0,${offset})`);
        }
    },
    {
        duration: parseTransitionDuration(node, "fade-down", 0.5, "enter"),
        alignment: parseTransitionAlignment(node, "fade-down", 1.0, "enter"),
        mode: "easeInCubic",
        callback: dt => {
            ghostNode.style.opacity = linearMix(0.0, parseFloat((node as HTMLElement).style.opacity) || 1.0, dt);
        }
    }]
};
