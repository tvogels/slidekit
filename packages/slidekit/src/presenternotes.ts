export default class PresenterNotes {
    private notes: Map<string, HTMLDivElement>;
    private emptyNode: HTMLDivElement;

    /**
     * HTML string where notes are separated by e.g.
     * `<h1>4</h1>`
     */
    constructor(htmlString: string) {
        // Split by H1
        this.notes = new Map();

        this.emptyNode = document.createElement("div");
        this.emptyNode.classList.add("presenter-note");

        const fragment = document.createElement("div");
        fragment.innerHTML = htmlString;
        let currentNote = null;
        for (let child of fragment.childNodes) {
            if (child.nodeName === "H1") {
                const noteId = child.textContent;
                currentNote = document.createElement("div");
                currentNote.classList.add("presenter-note");
                this.notes.set(noteId, currentNote);
            } else if (currentNote != null) {
                currentNote.appendChild(child.cloneNode(true));
            }
        }
    }

    getNote(slideId: string, stageId: string) {
        if (this.notes.has(stageId)) {
            return this.notes.get(stageId);
        } else if (this.notes.has(slideId)) {
            return this.notes.get(slideId);
        } else {
            return this.emptyNode;
        }
    }
}
