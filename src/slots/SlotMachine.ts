import * as PIXI from 'pixi.js';
import 'pixi-spine';
import { Reel, ReelSpinEvents } from './Reel';
import { sound } from '../utils/sound';
import { AssetLoader } from '../utils/AssetLoader';
import { Spine } from "pixi-spine";

const REEL_COUNT = 4;
const SYMBOLS_PER_REEL = 6;
const SYMBOL_SIZE = 150;
const REEL_HEIGHT = SYMBOL_SIZE;
const REEL_SPACING = 10;

export class SlotMachine {
    public container: PIXI.Container;
    private readonly reelsContainer: PIXI.Container;
    private reels: Reel[];
    private app: PIXI.Application;
    private isSpinning: boolean = false;
    private spinButton: PIXI.Sprite | null = null;
    private frameSpine: Spine | null = null;
    private winAnimation: Spine | null = null;
    private spinSound: Howl | null = null;
    private readonly centre: PIXI.Point;

    constructor(app: PIXI.Application) {
        this.app = app;
        this.container = new PIXI.Container();
        this.reelsContainer = new PIXI.Container();
        this.reels = [];

        this.centre = new PIXI.Point(
            (SYMBOL_SIZE * SYMBOLS_PER_REEL) / 2, 
            (REEL_HEIGHT * REEL_COUNT + REEL_SPACING * (REEL_COUNT - 1)) / 2
        );

        // Center the slot machine
        this.container.x = this.app.screen.width / 2 - this.centre.x;
        this.container.y = this.app.screen.height / 2 - this.centre.y;

        this.createBackground();

        this.createReels();

        this.initSpineAnimations();

        this.app.ticker.add((delta) => this.update(delta));
    }

    private createBackground(): void {
        const background = this.createBackgroundRectangle();
        this.container.addChild(background);
    }
    private createBackgroundRectangle(): PIXI.Graphics {
        const background = new PIXI.Graphics();
        background.beginFill(0xff0000, 0.5);
        background.drawRect(
            0,
            0,
            SYMBOL_SIZE * SYMBOLS_PER_REEL, // Width now based on symbols per reel
            REEL_HEIGHT * REEL_COUNT + REEL_SPACING * (REEL_COUNT - 1) // Height based on reel count
        );
        background.endFill();
        return background;
    }

    private createReels(): void {
        // Create each reel
        for (let i = 0; i < REEL_COUNT; i++) {
            const reel = new Reel(SYMBOLS_PER_REEL, SYMBOL_SIZE);
            reel.container.y = i * (REEL_HEIGHT + REEL_SPACING);
            this.reelsContainer.addChild(reel.container);
            this.reels.push(reel);
        }
        const mask = this.createBackgroundRectangle();
        this.reelsContainer.mask = mask;
        this.container.addChild(mask);
        this.container.addChild(this.reelsContainer);
    }

    public update(delta: number): void {
        // Update each reel
        for (const reel of this.reels) {
            reel.update(delta);
        }
        if (this.winAnimation && this.winAnimation.visible) {
            this.winAnimation.update(delta / 500);
        }
    }

    public async spin(): Promise<void> {
        if (this.isSpinning) {
            console.warn('Slot machine is already spinning.');
            return;
        }

        this.isSpinning = true;

        // Play spin sound
        this.spinSound = sound.play('Reel spin');
        this.spinSound.on('end', () => {
            this.spinSound = null;
        });

        // Disable spin button
        if (this.spinButton) {
            this.spinButton.texture = AssetLoader.getTexture('button_spin_disabled.png');
            this.spinButton.interactive = false;
        }

        // Start all reels with staggered delays
        const spinPromises: Promise<void>[] = [];
        for (let i = 0; i < this.reels.length; i++) {
            spinPromises.push(new Promise((resolve) => {
                setTimeout(() => {
                    this.reels[i].startSpin();
                    this.reels[i].events.once(ReelSpinEvents.REEL_SPIN_STARTED, () => {
                        resolve();
                    });
                    
                }, i * 200);
            }));
        }
        
        // Stop all reels after a delay
        setTimeout(() => {
            this.stopSpin();
        }, 500 + (this.reels.length - 1) * 200);
        
        await Promise.all(spinPromises);

    }

    private async stopSpin(): Promise<void> {
        for (let i = 0; i < this.reels.length; i++) {
            setTimeout(() => {
                this.reels[i].stopSpin();

                // If this is the last reel, check for wins and enable spin button
                if (i === this.reels.length - 1) {
                    setTimeout(async () => {
                        if(this.spinSound) {
                            this.spinSound.fade(1, 0, 500);
                            this.spinSound.on('fade', () => {
                                this.spinSound?.volume(1);
                                this.spinSound?.stop();
                                this.spinSound = null;
                            });
                        }
                        await this.checkWin();
                        this.isSpinning = false;

                        if (this.spinButton) {
                            this.spinButton.texture = AssetLoader.getTexture('button_spin.png');
                            this.spinButton.interactive = true;
                        }
                    }, 500);
                }
            }, i * 400);
        }
    }

    private async checkWin(): Promise<void> {
        // Simple win check - just for demonstration
        const randomWin = Math.random() < 0.3; // 30% chance of winning

        if (randomWin) {
        sound.play('win');
        console.log('Winner!');
            // TODO: Play the win animation found in "big-boom-h" spine
            return new Promise((resolve) => {
                if (this.winAnimation) {
                    this.winAnimation.skeleton.setToSetupPose();
                    this.winAnimation.state.setAnimation(0, 'start', false);
                    this.winAnimation.visible = true;
                    this.winAnimation.state.addListener({
                        complete: () => {
                            this.winAnimation!.visible = false;
                            resolve();
                        }
                    });
                } else {
                    resolve();
                }
            });
        }
    }
    

    public setSpinButton(button: PIXI.Sprite): void {
        this.spinButton = button;
    }

    private initSpineAnimations(): void {
        try {
            const frameSpineData = AssetLoader.getSpine('base-feature-frame.json');
            if (frameSpineData) {
                this.frameSpine = new Spine(frameSpineData.spineData);

                this.frameSpine.position.set(this.centre.x, this.centre.y);

                if (this.frameSpine.state.hasAnimation('idle')) {
                    this.frameSpine.state.setAnimation(0, 'idle', true);
                }

                this.container.addChild(this.frameSpine);
            }

            const winSpineData = AssetLoader.getSpine('big-boom-h.json');
            if (winSpineData) {
                this.winAnimation = new Spine(winSpineData.spineData);

                this.winAnimation.position.set(this.centre.x, this.centre.y);
                this.winAnimation.autoUpdate = false;
                this.winAnimation.visible = false;
                this.container.addChild(this.winAnimation);
            }
        } catch (error) {
            console.error('Error initializing spine animations:', error);
        }
    }
}
