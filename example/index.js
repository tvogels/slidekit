import { Controller, SlideDeck, PresenterNotes, plugins } from "slidekit";
import moment from "moment";

import slides from "./*.svg";
import notes from "./presenter-notes.md";

const slideList = Object.entries(slides).map(([key, value]) => ({ id: key, content: value }));

document.title = "Simple demo";  // title bar

const easeInOutCubic = t => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1);

const controller = new Controller(
    new SlideDeck(slideList, [plugins.youtubePlugin, plugins.hyperlinkPlugin, plugins.canvasPlugin]),
    document.getElementById("main-screen"),
    {
        duration: moment.duration(30, "minutes"),
        notes: new PresenterNotes(notes),
        scripts: {
            bouncy: {
                time: 0,
                tick(t) {
                    this.tickTime = t;
                },
                draw() {
                    const t = this.tickTime;
                    this.time++;
                    const {context} = this;
                    context.clearRect(0, 0, this.width, this.height);
                    context.fillStyle = "#EAEAEA";
                    context.fillRect(0, 0, this.width, this.height);
                    context.beginPath();
                    console.log(Math.floor(t))
                    const r = 30;
                    const progress = Math.floor(t) + easeInOutCubic(t%1);
                    const x = 126 + 202.5 * progress;
                    const y = this.height - 100*(progress+1)- r - 200 * Math.abs(Math.sin(Math.PI * this.time / 70), 2);
                    context.arc(x, y, r, 0, 2 * Math.PI)
                    context.fillStyle = '#666';
                    context.fill();
                    this.frame = requestAnimationFrame(this.draw.bind(this));
                },
                deactivate() {
                    cancelAnimationFrame(this.frame);
                },
                setNode(node) {
                    cancelAnimationFrame(this.frame);
                    const dpr = window.devicePixelRatio || 1;
                    this.canvas = node.querySelector("canvas");
                    this.width = parseInt(node.getAttribute("width"), 10);
                    this.height = parseInt(node.getAttribute("height"), 10);
                    this.canvas.style.width = `${this.width}px`;
                    this.canvas.style.height = `${this.height}px`;
                    this.canvas.width = this.width * dpr;
                    this.canvas.height = this.height * dpr
                    this.context = this.canvas.getContext('2d');
                    this.context.scale(dpr, dpr);
                    this.draw();
                },
            }
        }
    }
);

window.slides = controller;
