export default class PresenterNotes {
    private _notes: Map<string, string>
    private _emptyNode: HTMLDivElement

    /**
     * HTML string where notes are separated by e.g.
     * `<h1>4</h1>`
     */
    constructor(htmlString: string) {
        // Split by H1
        this._notes = new Map();

        this._emptyNode = document.createElement("div");
        this._emptyNode.classList.add("presenter-note");

        const fragment = document.createElement("div");
        fragment.innerHTML = htmlString;
        let currentNote = null;
        for (let child of fragment.childNodes) {
            if (child.nodeName === "H1") {
                const noteId = child.textContent;
                currentNote = document.createElement("div");
                currentNote.classList.add("presenter-note");
                this._notes.set(noteId, currentNote);
            } else if (currentNote != null) {
                currentNote.appendChild(child.cloneNode(true));
            }
        }
    }

    getNote(slideId: string, stageId: string) {
        if (this._notes.has(stageId)) {
            return this._notes.get(stageId);
        } else if (this._notes.has(slideId)) {
            return this._notes.get(slideId);
        } else {
            return this._emptyNode;
        }
    }
}
