import Controller from "./controller";
import "./shortcuts.css";

const shortcuts = [
    {
        keys: "Arrows, [, ]",
        action: "Next/previous step"
    },
    {
        keys: "Shift + Arrows",
        action: "Next/previous complete slide (skip animations)"
    },
    {
        keys: "Home / End",
        action: "Jump to the first/last slide"
    },
    {
        keys: "G 10 Enter",
        action: "Jump to slide 10"
    },
    {
        keys: "C / P",
        action: "Open the cockpit / presenter window"
    },
    {
        keys: "F",
        action: "Enter full-screen mode"
    },
    {
        keys: "T",
        action: "Start/stop the timer"
    },
    {
        keys: "R",
        action: "Reset the timer"
    },
    {
        keys: "Q",
        action: "Close the cockpit window"
    },
    {
        keys: "B",
        action: "Toggle 'black out'"
    },
    {
        keys: "W",
        action: "Toggle 'black out' in color white"
    }
];

export default class Shortcuts {
    private div: HTMLDivElement
    private controller: Controller

    constructor(controller: Controller) {
        this.close = this.close.bind(this);
        this.controller = controller;
        this.div = document.createElement("div");
        this.div.className = "keyboard-shortcuts";
        let str = `<div class="keyboard-shortcuts-close">&times;</div>`;
        for (let { keys, action } of shortcuts) {
            str += `
            <div class="keyboard-shortcuts-shortcut">
                <div class="keyboard-shortcuts-shortcut-keys">
                    ${keys}
                </div>
                <div class="keyboard-shortcuts-shortcut-action">
                    ${action}
                </div>
            </div>
            `;
        }
        this.div.innerHTML = str;
        for (let node of this.div.getElementsByClassName("keyboard-shortcuts-close")) {
            node.addEventListener("click", this.close);
        }
        document.body.appendChild(this.div);
    }

    close() {
        document.body.removeChild(this.div);
        this.controller.shortcuts = null;
    }
}
