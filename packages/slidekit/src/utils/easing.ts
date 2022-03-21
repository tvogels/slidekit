export default {
    linear: (t) => t,

    // accelerating from zero velocity
    easeInQuad: (t) => t * t,

    // decelerating to zero velocity
    easeOutQuad: (t) => t * (2 - t),

    // acceleration until halfway, then deceleration
    easeInOutQuad: (t) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),

    // accelerating from zero velocity
    easeInCubic: (t) => t * t * t,

    // decelerating to zero velocity
    easeOutCubic: (t) => --t * t * t + 1,

    // acceleration until halfway, then deceleration
    easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1),

    // accelerating from zero velocity
    easeInQuart: (t) => t * t * t * t,

    // decelerating to zero velocity
    easeOutQuart: (t) => 1 - --t * t * t * t,

    // acceleration until halfway, then deceleration
    easeInOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - 8 * --t * t * t * t),

    // accelerating from zero velocity
    easeInQuint: (t) => t * t * t * t * t,

    // decelerating to zero velocity
    easeOutQuint: (t) => 1 + --t * t * t * t * t,

    // acceleration until halfway, then deceleration
    easeInOutQuint: (t) => (t < 0.5 ? 16 * t * t * t * t * t : 1 + 16 * --t * t * t * t * t),

    // elastic bounce effect at the beginning
    easeInElastic: (t) => (0.04 - 0.04 / t) * Math.sin(25 * t) + 1,

    // elastic bounce effect at the end
    easeOutElastic: (t) => ((0.04 * t) / --t) * Math.sin(25 * t),

    // elastic bounce effect at the beginning and end
    easeInOutElastic: (t) =>
        (t -= 0.5) < 0
            ? (0.02 + 0.01 / t) * Math.sin(50 * t)
            : (0.02 - 0.01 / t) * Math.sin(50 * t) + 1,

    // ease in following a sine curve
    easeInSin: (t) => 1 + Math.sin((Math.PI / 2) * t - Math.PI / 2),

    // ease out following a sine curve
    easeOutSin: (t) => Math.sin((Math.PI / 2) * t),

    // ease in and out following a sine curve
    easeInOutSin: (t) => (1 + Math.sin(Math.PI * t - Math.PI / 2)) / 2,
};
