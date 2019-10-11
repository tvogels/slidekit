import html2canvas from "html2canvas";
import "regenerator-runtime/runtime";

function downloadDataUrl(dataUrl, filename) {
    var a = document.createElement("a");
    a.href = dataUrl;
    a.setAttribute("download", filename);
    a.click();
}

export async function record({ fps = 60, scale = 1.5 }) {
    // /usr/local/bin/ffmpeg -r 60 -i frame%05d.png -c:v libx264 -vf "fps=60,format=yuv420p" -an out.mp4
    //                          input framerate                           output framerate

    const screen = document.getElementById("main-screen");
    const deck = window.slides.deck;
    const controller = window.slides;

    screen.style.transform = `scale(${scale})`;

    let frame = 0;

    function storeFrame() {
        return html2canvas(screen).then(canvas => {
            downloadDataUrl(canvas.toDataURL("image/png"), `frame${frame.toString().padStart(5, "0")}.png`);
            frame++;
        });
    }

    for (let i = 0; i < deck.numSteps(); ++i) {
        controller.setPosition(i);
        // Store half a second of the frame
        for (let f = 0; f < fps / 2; ++f) {
            await storeFrame();
        }

        // Do the transition
        const duration = controller._durationBetweenPoints(i, i + 1);
        for (let f = 0; f < fps * duration; ++f) {
            controller.setPosition(i + f / fps / duration);
            await storeFrame();
        }
    }
}
