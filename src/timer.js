import moment from "moment";

export default class Timer {
    constructor(targetDuration) {
        this.reset();
        this._targetTime = targetDuration;
        this._listeners = new Set();
        setInterval(this._tick.bind(this), 1000);
    }

    start() {
        if (this.startTime == null) {
            this.startTime = moment.now();
        }
    }

    stop() {
        this.accumulatedTime += moment.now() - this.startTime;
        this.startTime = null;
    }

    toggle() {
        if (this.startTime == null) {
            this.start();
        } else {
            this.stop();
        }
    }

    elapsed() {
        let duration = this.accumulatedTime;
        if (this.startTime != null) {
            duration += moment.now() - this.startTime;
        }
        return duration;
    }

    progress() {
        return this.elapsed() / this._targetTime;
    }

    reset() {
        this.accumulatedTime = 0;
        this.startTime = null;
        setTimeout(this._tick.bind(this));
    }

    addTickListener(handle) {
        this._listeners.add(handle);
    }

    removeTickListener(handle) {
        this._listeners.delete(handle);
    }

    _tick() {
        const elapsed = moment.utc(this.elapsed()).format("mm:ss");
        const progress = this.progress();
        for (let handler of this._listeners) {
            handler(elapsed, progress);
        }
    }
}
