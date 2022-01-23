import snap from "snapsvg";
import CSSTransform from "../utils/css-transform";
import { linearMix } from "../utils";
import { getMoveElementById, Transition } from "./utils";
import { Step } from "../slidedeck";

const DEFAULT_TRANSITION_TIME = 0.5;
const DEFAULT_TRANSITION_ALIGNMENT = 0.5;

function transitionDuration(node: Element) {
    if (node.hasAttribute("duration")) {
        return parseFloat(node.getAttribute("duration"));
    }
    const attr = (node.getAttribute("move") || "").split(",");
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
    const attr = (node.getAttribute("move") || "").split(",");
    const userValue = parseFloat(attr[1]);
    if (isFinite(userValue)) {
        return userValue;
    } else {
        return DEFAULT_TRANSITION_ALIGNMENT;
    }
}

export default function (dom: HTMLElement, step: Step, nextStep: Step): Transition[] {
    const transitions = [];
    for (let node of dom.querySelectorAll("[move]")) {
        const id = node.getAttribute("id");
        const nodeInNextStage = getMoveElementById(id, nextStep.dom);
        if (nodeInNextStage == null) continue; // no match ... too bad

        const attributes = new Set([...node.getAttributeNames(), ...nodeInNextStage.getAttributeNames()]);
        for (let attribute of attributes) {
            let defaultValue = { opacity: "1", "fill-opacity": "1", transform: "", style: "" }[attribute];
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
                        duration: transitionDuration(node),
                        alignment: transitionAlignment(node),
                        mode: "easeInOutQuad",
                        callback: dt => {
                            node.setAttribute(attribute, eq.f(linearMix(eq.from, eq.to, dt)));
                        }
                    });
                } else if (["fill", "stroke"].includes(attribute)) {
                    const c1 = snap.color(currentValue);
                    const c2 = snap.color(nextValue);
                    const from = [c1.r, c1.g, c1.b, c1.opacity];
                    const to = [c2.r, c2.g, c2.b, c2.opacity];
                    transitions.push({
                        duration: transitionDuration(node),
                        alignment: transitionAlignment(node),
                        mode: "easeInOutQuad",
                        callback: dt => {
                            node.setAttribute(attribute, snap.rgb(...linearMix(from, to, dt)));
                        }
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
                        "font-size"
                    ].includes(attribute)
                ) {
                    transitions.push({
                        duration: transitionDuration(node),
                        alignment: transitionAlignment(node),
                        mode: "easeInOutQuad",
                        callback: dt => {
                            node.setAttribute(
                                attribute,
                                linearMix(parseFloat(currentValue), parseFloat(nextValue), dt)
                            );
                        }
                    });
                } else if (attribute === "transform") {
                    const a = new CSSTransform(currentValue);
                    const b = new CSSTransform(nextValue);
                    transitions.push({
                        duration: transitionDuration(node),
                        alignment: transitionAlignment(node),
                        mode: "easeInOutQuad",
                        callback: dt => {
                            node.setAttribute(attribute, a.mixString(b, dt));
                        }
                    });
                } else if (
                    ["move", "fade-in", "fade-out", "appear-along", "draw-line", "class", "stage", "min-stage", "max-stage"].includes(
                        attribute
                    )
                ) {
                    // Nothing to do
                } else {
                    console.error(
                        `Don't know how to handle transitions for attribute '${attribute}' (from ${currentValue} to ${nextValue}), node ${node.id}`
                    );
                }
            }
        }
    }
    return transitions;
}
