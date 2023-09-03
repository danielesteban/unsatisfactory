import Inventory from '../../core/inventory';
import { Item } from '../../objects/items';

const inventory = new Inventory(50, 500);
inventory.input(Item.ironPlate, 100);
inventory.input(Item.ironRod, 50);
inventory.input(Item.wire, 150);

export default inventory;
