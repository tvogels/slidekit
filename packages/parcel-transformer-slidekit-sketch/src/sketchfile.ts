import AdmZip from "adm-zip";
import crypto from "crypto";
import { exec } from "child_process";
import { mkdtemp, readFile, rm, writeFile } from "fs/promises";
import { promisify } from "util";
import path from "path";

export type Artboard = {
    name: string;
    id: string;
    hash: string;
    width: number;
    height: number;
    getSvg: () => Promise<Buffer>;
};

export default class SketchFile {
    private metadataFile: string;
    private zipFile: AdmZip;

    constructor(private filename: string, private cacheDir: string) {
        this.zipFile = (AdmZip as any)(filename);
        this.metadataFile = path.join(cacheDir, "metadata.json");
    }

    async getSvg(artboardId, hash): Promise<Buffer> {
        let metadata = await this.getMetadata();

        const cacheFilename = path.join(this.cacheDir, `${artboardId}.svg`);

        if (metadata[artboardId] != null && metadata[artboardId].hash === hash) {
            return await readFile(cacheFilename);
        } else {
            metadata[artboardId] = { hash: hash };
            const writeHandle = this.updateMetadata(metadata);
            const cmd = `sketchtool export artboards --use-id-for-name --formats=svg --item="${artboardId}" --output="${this.cacheDir}" "${this.filename}"`;
            await Promise.all([promisify(exec)(cmd), writeHandle]);
            return await readFile(cacheFilename);
        }
    }

    artboards() {
        const artboards: Artboard[] = [];

        for (let entry of this.zipFile.getEntries()) {
            if (entry.entryName.startsWith("pages/")) {
                const data = JSON.parse(entry.getData() as any);
                for (let layer of data.layers) {
                    if (layer._class !== "artboard") {
                        continue;
                    }
                    let hash = crypto.createHash("md5").update(JSON.stringify(layer)).digest("hex");
                    artboards.push({
                        name: layer.name,
                        id: layer.do_objectID,
                        hash: hash,
                        width: layer.frame.width,
                        height: layer.frame.height,
                        getSvg: () => this.getSvg(layer.do_objectID, hash),
                    });
                }
            }
        }

        artboards.sort((a, b) => {
            if (a.name < b.name) {
                return -1;
            } else if (a.name > b.name) {
                return 1;
            } else {
                return 0;
            }
        });

        return artboards;
    }

    /**
     * Remove cache files that don't appear in any of the artboards
     */
    async pruneCache(artboards?: Artboard[]) {
        const metadata = await this.getMetadata();

        const usedIds = new Set();
        for (let artboard of artboards || this.artboards()) {
            usedIds.add(artboard.id);
        }

        let handles = [];
        for (let id of Object.keys(metadata)) {
            if (!usedIds.has(id)) {
                const cacheFilename = path.join(this.cacheDir, `${id}.svg`);
                handles.push(rm(cacheFilename));
                delete metadata[id];
            }
        }
        handles.push(this.updateMetadata(metadata));
        await Promise.all(handles);
    }

    private async getMetadata() {
        return JSON.parse((await readFile(this.metadataFile).catch((e) => "{}")) as any);
    }

    private async updateMetadata(metadata) {
        return writeFile(this.metadataFile, JSON.stringify(metadata));
    }
}

async function artboardToSvg(file: string, artboardId: string): Promise<Buffer> {
    const tmpdir = await mkdtemp("/tmp/");
    const cmd = `sketchtool export artboards --use-id-for-name --formats=svg --item="${artboardId}" --output="${tmpdir}" "${file}"`;
    await promisify(exec)(cmd);
    const svgString = await readFile(path.join(tmpdir, `${artboardId}.svg`));
    await rm(tmpdir, { recursive: true, force: true });
    return svgString;
}
