import { Item } from '../../core/data';
import Inventory from '../../core/inventory';

const inventory = new Inventory(50, 500);
inventory.input(Item.ironPlate, 100);
inventory.input(Item.ironRod, 50);
inventory.input(Item.wire, 200);

export default inventory;
