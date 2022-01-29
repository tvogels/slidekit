export default class Canvas {
    dom: HTMLElement
    canvas: HTMLDivElement
    private slideNumber: HTMLDivElement
    private width: number
    private height: number
    private animationFrameRequested: boolean = false;
    private svg: HTMLElement;

    constructor(domElement: HTMLDivElement, deckWidth: number, deckHeight: number, withSlideNumbers = false) {
        this.dom = domElement;

        this.canvas = document.createElement("div");
        this.canvas.className = "slidekit-canvas";
        this.dom.appendChild(this.canvas);

        if (withSlideNumbers) {
            this.slideNumber = document.createElement("div");
            this.slideNumber.className = "slidekit-slide-number";
            this.dom.appendChild(this.slideNumber);
        } else {
            this.slideNumber = null;
        }

        this.canvas.style.transformOrigin = "0 0";
        this.canvas.style.transform = "scale(1)";
        this.canvas.style.transform = "scale(1)";

        this.width = deckWidth;
        this.height = deckHeight;

        this.resizeHandler = this.resizeHandler.bind(this);
        this.resizeHandler();
        window.addEventListener("resize", this.resizeHandler);
    }

    /**
     * Replace the contents of the screen with this SVG image
     * @param {HTMLElement} svg
     */
    setSvg(svg) {
        if (this.svg != null) {
            this.canvas.removeChild(this.svg);
        }
        this.canvas.appendChild(svg);
        this.svg = svg;
    }

    setSlideNumber(number) {
        if (this.slideNumber != null) {
            this.slideNumber.innerText = number;
        }
    }

    resizeHandler() {
        if (!this.animationFrameRequested) {
            this.animationFrameRequested = true;
            window.requestAnimationFrame(() => {
                const scale = Math.min(this.dom.clientHeight / this.height, this.dom.clientWidth / this.width);
                const offsetY = (this.dom.clientHeight - scale * this.height) / 2;
                const offsetX = (this.dom.clientWidth - scale * this.width) / 2;
                this.canvas.style.transform = `translate(${offsetX}px, ${offsetY}px) scale(${scale})`;
                this.animationFrameRequested = false;
            });
        }
    }
}
