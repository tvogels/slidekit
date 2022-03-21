import snap from "snapsvg";
import CSSTransform from "../utils/css-transform";
import { linearMix } from "../utils";
import {
    getMoveElementById,
    parseTransitionAlignment,
    parseTransitionDuration,
    Transition,
} from "./utils";
import { Stage } from "../slideplayer";

export const attribute = "move";

export function create(node: HTMLElement, stage: Stage, nextStage: Stage) {
    const transitions: Transition[] = [];

    const id = node.getAttribute("id");
    const nodeInNextStage = nextStage.dom.querySelector(`#${id}`);
    if (nodeInNextStage == null) {
        console.error(
            `Failed to match node ${node.id} in stage ${stage.step.slide.id}/${stage.step.numberWithinSlide} to a node in the next stage.`
        );
        return [];
    }

    const duration = parseTransitionDuration(node, "move", 0.5);
    const alignment = parseTransitionAlignment(node, "move", 0.5);

    const attributes = new Set([
        ...node.getAttributeNames(),
        ...nodeInNextStage.getAttributeNames(),
    ]);
    for (let attribute of attributes) {
        let defaultValue = {
            opacity: "1",
            "fill-opacity": "1",
            transform: "",
            style: "",
        }[attribute];
        if (defaultValue == null) {
            defaultValue = "0.0";
        }
        const currentValue = node.getAttribute(attribute) || defaultValue;
        const nextValue = nodeInNextStage.getAttribute(attribute) || defaultValue;
        if (currentValue !== nextValue) {
            if (["d"].includes(attribute)) {
                // We are using snap.svg for morphing between SVG paths
                let eq = snap(node).equal(attribute, nextValue);
                transitions.push({
                    duration,
                    alignment,
                    mode: "easeInOutQuad",
                    callback: (dt) => {
                        node.setAttribute(attribute, eq.f(linearMix(eq.from, eq.to, dt)));
                    },
                });
            } else if (["fill", "stroke"].includes(attribute)) {
                const c1 = snap.color(currentValue);
                const c2 = snap.color(nextValue);
                const from = [c1.r, c1.g, c1.b, c1.opacity];
                const to = [c2.r, c2.g, c2.b, c2.opacity];
                transitions.push({
                    duration,
                    alignment,
                    mode: "easeInOutQuad",
                    callback: (dt) => {
                        node.setAttribute(attribute, snap.rgb(...linearMix(from, to, dt)));
                    },
                });
            } else if (
                [
                    "x",
                    "y",
                    "opacity",
                    "rx",
                    "height",
                    "width",
                    "cx",
                    "cy",
                    "r",
                    "fill-opacity",
                    "x1",
                    "x2",
                    "y1",
                    "y2",
                    "font-size",
                ].includes(attribute)
            ) {
                transitions.push({
                    duration,
                    alignment,
                    mode: "easeInOutQuad",
                    callback: (dt) => {
                        node.setAttribute(
                            attribute,
                            linearMix(parseFloat(currentValue), parseFloat(nextValue), dt)
                        );
                    },
                });
            } else if (attribute === "transform") {
                const a = new CSSTransform(currentValue);
                const b = new CSSTransform(nextValue);
                transitions.push({
                    duration,
                    alignment,
                    mode: "easeInOutQuad",
                    callback: (dt) => {
                        node.setAttribute(attribute, a.mixString(b, dt));
                    },
                });
            } else if (
                [
                    "move",
                    "fade-in",
                    "fade-out",
                    "appear-along",
                    "draw-line",
                    "class",
                    "stage",
                    "min-stage",
                    "max-stage",
                    "href",
                ].includes(attribute)
            ) {
                // Nothing to do
            } else {
                console.error(
                    `Don't know how to handle transitions for attribute '${attribute}' (from ${currentValue} to ${nextValue}), node ${node.id}`
                );
            }
        }
    }

    return transitions;
}
