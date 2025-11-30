jest.mock('pixi.js', () => {
  const actualPixi = jest.requireActual('pixi.js');
  return {
    ...actualPixi,
    Application: jest.fn().mockImplementation(() => ({
      screen: { width: 800, height: 600 },
      ticker: { add: jest.fn() }
    })),
    Container: jest.fn().mockImplementation(() => ({
      addChild: jest.fn(),
      x: 0,
      y: 0
    })),
    Graphics: jest.fn().mockImplementation(() => ({
      beginFill: jest.fn(),
      drawRect: jest.fn(),
      endFill: jest.fn()
    })),
    Point: jest.fn().mockImplementation((x, y) => ({ x, y }))
  };
});

jest.mock('pixi-spine', () => ({
  Spine: jest.fn().mockImplementation(() => ({
    position: { set: jest.fn() },
    state: {
      hasAnimation: jest.fn(() => true),
      setAnimation: jest.fn(),
      addListener: jest.fn()
    },
    skeleton: { setToSetupPose: jest.fn() },
    visible: false,
    autoUpdate: false,
    update: jest.fn(),
    addEventListener: jest.fn()
  }))
}));

jest.mock('../../src/utils/sound', () => ({
  sound: { play: jest.fn(() => ({ on: jest.fn(), fade: jest.fn(), stop: jest.fn(), volume: jest.fn() })) }
}));

jest.mock('../../src/utils/AssetLoader', () => ({
  AssetLoader: {
    getTexture: jest.fn(() => PIXI.Texture.EMPTY),
    getSpine: jest.fn(() => new Spine({} as any))
  }
}));

import { Spine } from 'pixi-spine';
import { SlotMachine } from '../../src/slots/SlotMachine';
import * as PIXI from 'pixi.js';

describe('SlotMachine', () => {
  let app: PIXI.Application;
  beforeEach(() => {
    app = new PIXI.Application();
  });

  it('should initialize with correct properties', () => {
    const slotMachine = new SlotMachine(app);
    expect(slotMachine.container).toBeDefined();
  });

  it('should set spin button', () => {
    const slotMachine = new SlotMachine(app);
    const button = { texture: {}, interactive: true } as any;
    slotMachine.setSpinButton(button);
    expect(slotMachine['spinButton']).toBe(button);
  });

  it('should not spin if already spinning', async () => {
    const slotMachine = new SlotMachine(app);
    expect(slotMachine['isSpinning']).toBe(false);
    slotMachine['isSpinning'] = true;
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
    await slotMachine.spin();
    expect(slotMachine['isSpinning']).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalledWith('Slot machine is already spinning.');
    consoleWarnSpy.mockRestore();
  });
});
