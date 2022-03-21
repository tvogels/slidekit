import { now, Duration, utc } from "moment";

type Listener = (elapsed: string, progress: number) => void;

export default class Timer {
    private startTime: number;
    private accumulatedTime: number;
    private targetTime: Duration;
    private listeners: Set<Listener>;

    constructor(targetDuration) {
        this.reset();
        this.targetTime = targetDuration;
        this.listeners = new Set();
        setInterval(this._tick.bind(this), 1000);
    }

    start() {
        if (this.startTime == null) {
            this.startTime = now();
        }
    }

    stop() {
        this.accumulatedTime += now() - this.startTime;
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
            duration += now() - this.startTime;
        }
        return duration;
    }

    progress() {
        return this.elapsed() / (this.targetTime as any);
    }

    reset() {
        this.accumulatedTime = 0;
        this.startTime = null;
        setTimeout(this._tick.bind(this));
    }

    addTickListener(handle: Listener) {
        this.listeners.add(handle);
    }

    removeTickListener(handle: Listener) {
        this.listeners.delete(handle);
    }

    _tick() {
        const elapsed = utc(this.elapsed()).format("mm:ss");
        const progress = this.progress();
        for (let handler of this.listeners) {
            handler(elapsed, progress);
        }
    }
}
