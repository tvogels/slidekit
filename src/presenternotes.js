export default class PresenterNotes {
    /**
     * HTML string where notes are separated by e.g.
     * `<h1>4</h1>`
     * @param {string} htmlString
     */
    constructor(htmlString) {
        // Split by H1
        this.notes = [];
        this.numbers = [];

        this.emptyNode = document.createElement("div");
        this.emptyNode.classList.add("presenter-note");

        const fragment = document.createElement("div");
        fragment.innerHTML = htmlString;
        let currentSlide = 0;
        let currentNote = null;
        for (let child of fragment.childNodes) {
            if (child.nodeName === "H1") {
                currentSlide = parseInt(child.textContent);
                currentNote = document.createElement("div");
                currentNote.classList.add("presenter-note");
                this.numbers.push(currentSlide);
                this.notes.push(currentNote);
            } else if (currentNote != null) {
                currentNote.appendChild(child.cloneNode(true));
            }
        }
    }

    getNotesForStage(stageNumber) {
        let idx = [...this.numbers].reverse().findIndex(n => n <= stageNumber);
        if (idx == null) {
            return this.emptyNode;
        }
        idx = this.numbers.length - 1 - idx;
        return this.notes[idx];
    }
}
