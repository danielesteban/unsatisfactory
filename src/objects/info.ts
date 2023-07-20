import { ColorRepresentation, FrontSide } from 'three';
// @ts-ignore
import { Text } from 'troika-three-text';

class Info extends Text {
  constructor(text: string = '', size: number = 0.2, color: ColorRepresentation = 0xEEEEEE) {
    super();
    const troika = (this as any);
    troika.fontSize = size;
    troika.outlineWidth = size / 10;
    troika.anchorX = 'center';
    troika.anchorY = 'middle';
    troika.font = 'https://fonts.gstatic.com/s/robotocondensed/v25/ieVl2ZhZI2eCN5jzbjEETS9weq8-59Y.woff';
    troika.color = color;
    troika.material[1].fog = false;
    troika.material[1].side = FrontSide;
    troika.material[1].transparent = true;
    this.setText(text);
  }

  setText(text: string) {
    const troika = (this as any);
    troika.text = text;
    if (text) troika.sync();
    troika.visible = !!text;
  }

  raycast() {

  }
}

export default Info;
