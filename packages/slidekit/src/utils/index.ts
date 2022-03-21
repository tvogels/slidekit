import { Element } from "snapsvg";

/**
 * Mix two numbers or array fo numbers as
 * a * (1-alpha) + b * alpha
 */
export function linearMix(a: number | number[], b: number | number[], alpha: number) {
    if (Array.isArray(a) && Array.isArray(b)) {
        return a.map((aa, i) => linearMix(aa, b[i], alpha));
    } else if (!Array.isArray(a) && !Array.isArray(b)) {
        return a + (b - a) * alpha;
    } else {
        throw new Error("Invalid combination of arguments");
    }
}

/**
 * Find the local angle of an SVG path using a Finite Difference approximation.
 */
export function getAngleAtPath(path: Element, position: number, totalLength: number) {
    const delta = 1 / 60;
    const p1 = Math.min(position, 1 - delta);
    const p2 = p1 + delta;
    const c1 = path.getPointAtLength(totalLength * p1);
    const c2 = path.getPointAtLength(totalLength * p2);
    const dx = c2.x - c1.x;
    const dy = c2.y - c1.y;
    return (Math.atan2(dy, dx) / Math.PI) * 180;
}

export function copyToClipboard(document: Document, str: string) {
    console.log("copying", str);
    const el = document.createElement("textarea");
    el.value = str;
    el.setAttribute("readonly", "");
    el.style.position = "absolute";
    el.style.left = "-9999px";
    document.body.appendChild(el);
    const selected =
        document.getSelection().rangeCount > 0 ? document.getSelection().getRangeAt(0) : false;
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    if (selected) {
        document.getSelection().removeAllRanges();
        document.getSelection().addRange(selected);
    }
}
