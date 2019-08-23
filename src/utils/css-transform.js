import { linearMix } from '.'

/**
 * Representation of a CSS Transform that can generate
 * interpolated CSS Transform strings
 */
export default class CSSTransform {
    /**
     * @param {string} transformString 
     */
    constructor(transformString) {
        const parts = transformString.match(/\w+\(.*?\)/g);
        if (parts != null) {
            this.parts = parts.map(p => new CSSTransformPart(p));
        } else {
            this.parts = [];
        }
    }

    /**
     * 
     * @param {CSSTransform} other 
     * @param {number} alpha between 0 and 1
     */
    mixString(other, alpha) {
        // Reference: https://www.w3.org/TR/css-transforms-1/#interpolation-of-transforms
        // This is not really correct yet in all cases.
        const outArray = [];
        for (let i = 0; i < Math.max(this.parts.length, other.parts.length); ++i) {
            let a = this.parts[i] || other.parts[i].identityTransform();
            let b = other.parts[i] || this.parts[i].identityTransform();
            if (a.name !== b.name) {
                console.error("Haven't implemented interpolatino of transforms in different order.");
            }
            outArray.push(a.mixString(b, alpha));
        }
        return outArray.join(" ");
    }
}

class CSSTransformPart {
    constructor(string) {
        const parts = string.match(/(\w+)\((-?[\w\d.]+)(?:,\s*(-?[\w\d.]+))*\)/);
        if (parts == null) {
            throw new Error(`Failed to parse transform part '${string}'`);
        }
        this.name = parts[1];
        this.values = [];
        for (let i = 2; i < parts.length; ++i) {
            if (parts[i] != null) {
                this.values.push(parseFloat(parts[i]));
            }
        }
    }

    toString(values = null) {
        if (values == null) {
            values = this.values;
        }
        return `${this.name}(${values.join(", ")})`;
    }

    mixString(otherTransform, alpha) {
        return this.toString(linearMix(this.values, otherTransform.values, alpha));
    }

    identityTransform() {
        if (this.name === "translate") {
            return new CSSTransformPart("translate(0,0)");
        } else if (this.name === "translateX") {
            return new CSSTransformPart("translateX(0)");
        } else if (this.name === "translateY") {
            return new CSSTransformPart("translateY(0)");
        } else if (this.name === "scale") {
            return new CSSTransformPart("scale(1.0)");
        } else if (this.name === "rotate") {
            return new CSSTransformPart("rotate(0)");
        } else {
            console.error(`Don't know what the identity transform for '${this.name}' is.`)
        }
    }
}
