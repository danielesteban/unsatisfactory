import {
  Audio,
  AudioListener,
  AudioLoader,
  Group,
  PerspectiveCamera,
  PositionalAudio,
  Vector3,
} from 'three';
import * as Sounds from '../sounds';
import UI from '../ui/sfx.svelte';

export type SoundPromise = {
  then: (resolve: (sfx: PositionalAudio | undefined) => void) => void;
  abort: () => void;
  pause: () => void;
  resume: () => void;
};

class SFX extends Group {
  private readonly ambient: {
    sounds: (keyof typeof Sounds)[],
    players: Audio[],
  } = { sounds: ['ambient'], players: [] };
  private readonly music: {
    url?: string,
    player?: HTMLAudioElement,
  } = {};
  private buffers?: Record<keyof typeof Sounds, AudioBuffer>;
  private isMuted: boolean;
  private listener?: AudioListener;
  private readonly pool: PositionalAudio[] = [];
  private readonly queued: (() => void)[] = [];

  constructor() {
    super();
    this.matrixAutoUpdate = false;
    this.isMuted = !!localStorage.getItem('sfx:muted');
    this.init();
  }

  private async init() {
    new UI({
      props: { sfx: this },
      target: document.getElementById('ui')!,
    });

    await new Promise<void>((resolve) => {
      const onFirstInteraction = () => {
        window.removeEventListener('keydown', onFirstInteraction);
        window.removeEventListener('pointerdown', onFirstInteraction);
        resolve();
      };
      window.addEventListener('keydown', onFirstInteraction);
      window.addEventListener('pointerdown', onFirstInteraction);
    });

    const loader = new AudioLoader();
    const buffers = await Promise.all(
      Object.keys(Sounds).map((sound) => loader.loadAsync((Sounds as any)[sound]))
    );
    this.buffers = Object.keys(Sounds).reduce((sounds, id, i) => {
      sounds[id] = buffers[i];
      return sounds;
    }, {} as Record<string, AudioBuffer>);

    this.listener = new AudioListener();
    document.addEventListener('visibilitychange', this.updateMute.bind(this), false);
    this.updateMute();

    this.setAmbient(this.ambient.sounds);
    this.setMusic(this.music.url);

    this.queued.forEach((resolve) => resolve());
    this.queued.length = 0;

    this.dispatchEvent({ type: 'listener', listener: this.listener });
  }

  getListener() {
    return this.listener;
  }

  getMuted() {
    return this.isMuted;
  }

  setAmbient(sounds: (keyof typeof Sounds)[]) {
    const { ambient, buffers, listener } = this;
    ambient.sounds = sounds;
    ambient.players.forEach((player) => (
      player.stop()
    ));
    if (buffers && listener) {
      ambient.players = ambient.sounds.map((sound) => {
        const player = new Audio(listener);
        player.setBuffer(buffers[sound]);
        player.setLoop(true);
        player.setVolume(0.4);
        player.play();
        return player;
      });
    }
  }

  getSound(id: keyof typeof Sounds, position: Vector3, detune: number = (Math.random() - 0.5) * 1000, loop: boolean = true, volume: number = 0.4): SoundPromise {
    let aborted = false;
    let paused = false;
    let sound: PositionalAudio | undefined;
    const promise = (new Promise<void>((resolve) => {
      const { buffers, listener, queued } = this;
      if (!buffers || !listener) {
        queued.push(resolve);
        return;
      }
      resolve();
    }))
    .then(() => {
      const { buffers, listener } = this;
      if (aborted) {
        return;
      }
      sound = new PositionalAudio(listener!);
      sound.matrixAutoUpdate = false;
      sound.setBuffer(buffers![id]);
      sound.setLoop(loop);
      sound.setRefDistance(0.5);
      this.add(sound);
      sound.position.copy(position);
      sound.updateMatrix();
      if (!paused) {
        sound.play(sound.listener.timeDelta + Math.random());
        sound.setDetune(detune);
        sound.setVolume(volume);
      }
      return sound;
    });
    return {
      then: (resolve) => promise.then(resolve),
      abort: () => {
        aborted = true;
        if (sound?.isPlaying) {
          sound.stop();
        }
      },
      pause: () => {
        if (!sound) {
          paused = true;
          return;
        }
        if (sound.isPlaying) {
          sound.pause();
        }
      },
      resume: () => {
        if (!sound) {
          paused = false;
          return;
        }
        if (!sound.isPlaying) {
          sound.play(sound.listener.timeDelta + Math.random());
          sound.setDetune(detune);
          sound.setVolume(volume);
        }
      },
    };
  }

  playAt(id: keyof typeof Sounds, position: Vector3, detune: number = 0, volume: number = 0.4) {
    const { buffers, listener, pool } = this;
    if (!buffers || !listener) {
      return;
    }
    let sound = pool.find(({ isPlaying, userData }) => !isPlaying && userData.id === id);
    if (!sound) {
      sound = new PositionalAudio(listener);
      sound.userData.id = id;
      sound.matrixAutoUpdate = false;
      sound.setBuffer(buffers[id]);
      sound.setRefDistance(0.5);
      pool.push(sound);
      this.add(sound);
    }
    sound.position.copy(position);
    sound.updateMatrix();
    sound.play(sound.listener.timeDelta);
    sound.setDetune(detune);
    sound.setVolume(volume);
    return sound;
  }

  setMusic(url?: string) {
    const { isMuted, music, listener } = this;
    if (music.player && music.url === url) {
      return;
    }
    music.url = url;
    if (music.player) {
      music.player.src = '';
      delete music.player;
    }
    if (listener && url) {
      music.player = document.createElement('audio');
      music.player.loop = true;
      music.player.volume = 0.4;
      music.player.src = url;
      if (!isMuted) {
        music.player.play();
      }
    }
  }

  setMuted(muted: boolean) {
    this.isMuted = muted;
    if (muted) {
      localStorage.setItem('sfx:muted', '1');
    } else {
      localStorage.removeItem('sfx:muted');
    }
    this.updateMute();
  }

  updateListener(camera: PerspectiveCamera) {
    const { listener } = this;
    if (!listener) {
      return;
    }
    camera.matrixWorld.decompose(listener.position, listener.quaternion, listener.scale);
    listener.updateMatrixWorld();
  }

  private updateMute() {
    const { isMuted, listener, music } = this;
    const mute = isMuted || document.visibilityState !== 'visible';
    if (listener) {
      listener.setMasterVolume(mute ? 0 : 1);
    }
    if (music.player) {
      if (mute && !music.player.paused) {
        music.player.pause();
      }
      if (!mute && music.player.paused) {
        music.player.play();
      }
    }
  }
}

export default SFX;
