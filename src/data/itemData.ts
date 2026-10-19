import { Item } from '../types/game';
import { ABILITY_CAPSULE_TEMPLATE } from './abilities';
import { FLOOR_ITEM_POOL } from './eventData';
import { BATTLE_ORBS, ORAN_BERRY, SITRUS_BERRY, STATUS_BERRIES } from './pokemonData';

export const SHOP_STOCK_SIZE = 5;

const template = (name: string): Omit<Item, 'id' | 'count'> => {
  const found = [ORAN_BERRY, ...STATUS_BERRIES, ...BATTLE_ORBS, ...FLOOR_ITEM_POOL, ABILITY_CAPSULE_TEMPLATE].find((t) => t.name === name);
  if (!found) throw new Error(`Unknown shop item: ${name}`);
  return found;
};

// weight = how likely the item is to be on sale on a given visit
export const SHOP_CATALOG: { item: Omit<Item, 'id' | 'count'>; price: number; weight: number }[] = [
  { item: ORAN_BERRY, price: 80, weight: 3 },
  { item: SITRUS_BERRY, price: 220, weight: 1.5 },
  { item: template('Manzana Grande'), price: 60, weight: 3 },
  { item: template('Baya Meloc'), price: 70, weight: 2 },
  { item: template('Baya Zreza'), price: 70, weight: 2 },
  { item: template('Baya Caquic'), price: 70, weight: 2 },
  { item: template('Baya Safre'), price: 70, weight: 2 },
  { item: template('Baya Perasi'), price: 70, weight: 2 },
  { item: template('Ofuscosfera'), price: 200, weight: 1.2 },
  { item: template('Rapidosfera'), price: 200, weight: 1.2 },
  { item: template('Elixir'), price: 150, weight: 2 },
  { item: template('Semilla Sueño'), price: 120, weight: 1.5 },
  { item: template('Semilla Revivir'), price: 250, weight: 1.5 },
  { item: template('Fugaesfera'), price: 300, weight: 1 },
  { item: ABILITY_CAPSULE_TEMPLATE, price: 2000, weight: 0.5 },
];

/** Picks the items Kecleon sells until the next return to the village. */
export const rollShopStock = (): string[] => {
  const pool = [...SHOP_CATALOG];
  const stock: string[] = [];
  while (stock.length < SHOP_STOCK_SIZE && pool.length > 0) {
    let roll = Math.random() * pool.reduce((sum, e) => sum + e.weight, 0);
    const idx = Math.max(0, pool.findIndex((e) => (roll -= e.weight) < 0));
    stock.push(pool[idx].item.name);
    pool.splice(idx, 1);
  }
  return stock;
};

export const isValidShopStock = (stock: unknown): stock is string[] =>
  Array.isArray(stock) &&
  stock.length === SHOP_STOCK_SIZE &&
  stock.every((name) => SHOP_CATALOG.some((e) => e.item.name === name));
