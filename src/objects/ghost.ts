import {
  BufferGeometry,
  Mesh,
  MeshStandardMaterial,
  Shader,
  Vector3,
} from 'three';
import { getGeometry as getBrushGeometry } from '../core/brush';
import { PoweredContainer } from '../core/container';
import { Brush } from '../core/data';
import Belts, { Connection } from './belts';
import Wires from './wires';

class Ghost extends Mesh {
  private static material: MeshStandardMaterial | undefined;
  static getMaterial() {
    if (!Ghost.material) {
      const material = new MeshStandardMaterial({
        color: 0x555599,
        transparent: true,
      });
      material.customProgramCacheKey = () => 'Ghost';
      material.onBeforeCompile = (shader: Shader) => {
        shader.fragmentShader = shader.fragmentShader
          .replace(
            '#include <clipping_planes_pars_fragment>',
            /* glsl */`
            #include <clipping_planes_pars_fragment>
            uniform float time;
            `
          )
          .replace(
            'vec4 diffuseColor = vec4( diffuse, opacity );',
            /* glsl */`
            float line = smoothstep(1.0, 3.0, mod(float(gl_FragCoord.y) + time * 20.0, 5.0));
            vec4 diffuseColor = vec4(diffuse, opacity * line);
            `
          );
      };
      Ghost.material = material;
    }
    return Ghost.material;
  }

  constructor() {
    super(undefined, Ghost.getMaterial());
    this.matrixAutoUpdate = false;
    this.visible = false;
  }

  setBelt(from: Connection, to: Connection, isValid: boolean) {
    const { geometry, position } = Belts.getGeometry(from, to);
    this.setGeometry(geometry, true);
    this.position.copy(position);
    this.rotation.set(0, 0, 0);
    this.update(isValid);
  }

  setBrush(brush: Brush, position: Vector3, rotation: number, isValid: boolean) {
    this.setGeometry(getBrushGeometry(brush));
    this.position.copy(position);
    this.rotation.set(0, rotation, 0);
    this.update(isValid);
  }

  setConnector(connector: Mesh, isValid: boolean) {
    this.setGeometry(connector.geometry);
    connector.getWorldPosition(this.position);
    connector.getWorldQuaternion(this.quaternion);
    this.update(isValid);
  }

  setWire(from: PoweredContainer, to: PoweredContainer, isValid: boolean) {
    const { geometry, position } = Wires.getGeometry(from, to);
    this.setGeometry(geometry, true);
    this.position.copy(position);
    this.rotation.set(0, 0, 0);
    this.update(isValid);
  }

  private tempGeometry?: BufferGeometry;
  private setGeometry(geometry: BufferGeometry, isTemp: boolean = false) {
    if (this.tempGeometry) {
      this.tempGeometry.dispose();
      this.tempGeometry = undefined;
    }
    this.geometry = geometry;
    if (isTemp) {
      this.tempGeometry = geometry;
    }
  }

  private update(isValid: boolean) {
    (this.material as MeshStandardMaterial).color.setHex(isValid ? 0x555599 : 0x995555);
    this.updateMatrix();
    this.visible = true;
  }
}

export default Ghost;
