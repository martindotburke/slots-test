import { Howl } from "howler";

// TODO: Implement sound player using the "howler" package

const audioCache: Record<string, Howl> = {};

export const sound = {
    add: async (alias: string, url: string): Promise<void> => {
        return new Promise((resolve, reject) => {
            const sound = new Howl({
                src: [url],
                preload: true,
                onload: () => {
                    console.log(`Sound added: ${alias} from ${url}`);
                    audioCache[alias] = sound;
                    resolve();
                },
                onloaderror: (id, error) => {
                    console.error(`Error loading sound ${alias} from ${url}:`, error);
                    reject();
                }
            });
        })
    },
    play: (alias: string): Howl => {
        const sound =  audioCache[alias];
        sound.play();
        return sound;
    }
};
