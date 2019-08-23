import { SlideDeck, Controller, KeyboardController } from './src/index'

import slides from './slides.json'

const wrapper = document.getElementById('canvas-wrapper');
const canvas = document.getElementById('canvas');
const deck = new SlideDeck(canvas, slides);
const controller = new Controller(deck);

window.controller = controller;
window.keyboardController = new KeyboardController(controller, canvas, wrapper);
