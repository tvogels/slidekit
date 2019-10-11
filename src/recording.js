import html2canvas from "html2canvas";
import "regenerator-runtime/runtime";
import moment from "moment";

function downloadDataUrl(dataUrl, filename) {
    var a = document.createElement("a");
    a.href = dataUrl;
    a.setAttribute("download", filename);
    a.click();
}

export function recordDurations(controller) {
    const durations = [];

    let current = {
        pos: controller.currentPosition,
        start: moment.now()
    };

    controller.addRenderListener(dt => {
        if (current != null && dt !== current.pos) {
            durations.push({
                step: current.pos,
                start: current.start,
                duration: moment.now() - current.start
            });
            current = null;
        }
        if (dt % 1 === 0) {
            current = {
                pos: dt,
                start: moment.now()
            };
        }
    });

    return () => {
        if (current == null) {
            return durations;
        } else {
            return [
                ...durations,
                {
                    step: current.pos,
                    start: current.start,
                    duration: moment.now() - current.start
                }
            ];
        }
    };
}

export async function record(durationSpec, fps = 24, scale = 1.5) {
    // /usr/local/bin/ffmpeg -r 60 -i frame%05d.png -c:v libx264 -vf "fps=60,format=yuv420p" -an out.mp4
    //                          input framerate                           output framerate

    const defaultFrameDuration = 0.5; // seconds

    const screen = document.getElementById("main-screen");
    const deck = window.slides.deck;
    const controller = window.slides;

    let frame = 0;

    if (durationSpec == null) {
        durationSpec = [];
        for (let i = 0; i < deck.numSteps(); ++i) {
            durationSpec.push({
                step: i,
                duration: defaultFrameDuration * 1000
            });
        }
    }

    screen.style.transform = `scale(${scale})`;

    function storeFrame() {
        return html2canvas(screen).then(canvas => {
            downloadDataUrl(canvas.toDataURL("image/png"), `frame${frame.toString().padStart(5, "0")}.png`);
            frame++;
        });
    }

    for (let { step, duration } of durationSpec) {
        controller.setPosition(step);
        // Store half a second of the frame
        for (let f = 0; f < (fps * duration) / 1000; ++f) {
            await storeFrame();
        }

        // Do the transition
        const transitionDuration = controller._durationBetweenPoints(step, step + 1);
        for (let f = 0; f < fps * transitionDuration; ++f) {
            controller.setPosition(step + f / fps / transitionDuration);
            await storeFrame();
        }
    }
}
