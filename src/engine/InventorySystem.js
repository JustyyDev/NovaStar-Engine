/**
 * NovaStar Inventory System v0.4
 * Item management with stacking, categories, equipment slots, and crafting
 *
 * Usage:
 *   const inv = new InventorySystem(engine, { maxSlots: 20 });
 *   inv.registerItem('health-potion', { name: 'Health Potion', category: 'consumable', stackable: true, maxStack: 10, icon: 'potion' });
 *   inv.add('health-potion', 3);
 *   inv.use('health-potion'); // triggers onUse callback
 */

export class InventorySystem {
  constructor(engine, options = {}) {
    this.engine = engine;
    this.maxSlots = options.maxSlots || 20;
    this.items = new Map(); // itemId -> definition
    this.slots = []; // { itemId, count }
    this.equipment = new Map(); // slot name -> itemId
    this._onChange = [];
    this._onUse = [];
  }

  registerItem(id, def) {
    this.items.set(id, {
      id, name: def.name || id, description: def.description || '',
      category: def.category || 'misc', icon: def.icon || null,
      stackable: def.stackable !== false, maxStack: def.maxStack || 99,
      value: def.value || 0, rarity: def.rarity || 'common',
      equipSlot: def.equipSlot || null, stats: def.stats || {},
      onUse: def.onUse || null, onEquip: def.onEquip || null, onUnequip: def.onUnequip || null,
    });
  }

  add(itemId, count = 1) {
    const def = this.items.get(itemId);
    if (!def) { console.warn('[Inventory] Unknown item:', itemId); return false; }
    let remaining = count;
    // Try stacking into existing slots
    if (def.stackable) {
      for (const slot of this.slots) {
        if (slot.itemId === itemId && slot.count < def.maxStack) {
          const canAdd = Math.min(remaining, def.maxStack - slot.count);
          slot.count += canAdd;
          remaining -= canAdd;
          if (remaining <= 0) break;
        }
      }
    }
    // Add to new slots
    while (remaining > 0 && this.slots.length < this.maxSlots) {
      const stackSize = def.stackable ? Math.min(remaining, def.maxStack) : 1;
      this.slots.push({ itemId, count: stackSize });
      remaining -= stackSize;
    }
    if (remaining > 0) { console.warn('[Inventory] Full, dropped', remaining, 'x', itemId); }
    this._notify();
    return remaining <= 0;
  }

  remove(itemId, count = 1) {
    let remaining = count;
    for (let i = this.slots.length - 1; i >= 0; i--) {
      if (this.slots[i].itemId === itemId) {
        const take = Math.min(remaining, this.slots[i].count);
        this.slots[i].count -= take;
        remaining -= take;
        if (this.slots[i].count <= 0) this.slots.splice(i, 1);
        if (remaining <= 0) break;
      }
    }
    this._notify();
    return remaining <= 0;
  }

  has(itemId, count = 1) {
    let total = 0;
    for (const slot of this.slots) { if (slot.itemId === itemId) total += slot.count; }
    return total >= count;
  }

  count(itemId) {
    let total = 0;
    for (const slot of this.slots) { if (slot.itemId === itemId) total += slot.count; }
    return total;
  }

  use(itemId) {
    const def = this.items.get(itemId);
    if (!def || !this.has(itemId)) return false;
    if (def.onUse) def.onUse(this, def);
    this._onUse.forEach(fn => fn(def));
    if (def.category === 'consumable') this.remove(itemId, 1);
    return true;
  }

  equip(itemId) {
    const def = this.items.get(itemId);
    if (!def || !def.equipSlot || !this.has(itemId)) return false;
    if (this.equipment.has(def.equipSlot)) this.unequip(def.equipSlot);
    this.equipment.set(def.equipSlot, itemId);
    if (def.onEquip) def.onEquip(this, def);
    this._notify();
    return true;
  }

  unequip(slotName) {
    const itemId = this.equipment.get(slotName);
    if (!itemId) return;
    const def = this.items.get(itemId);
    if (def?.onUnequip) def.onUnequip(this, def);
    this.equipment.delete(slotName);
    this._notify();
  }

  getEquipped(slotName) {
    const itemId = this.equipment.get(slotName);
    return itemId ? this.items.get(itemId) : null;
  }

  getSlots() { return this.slots.map(s => ({ ...s, item: this.items.get(s.itemId) })); }
  getByCategory(cat) { return this.slots.filter(s => this.items.get(s.itemId)?.category === cat); }
  get isFull() { return this.slots.length >= this.maxSlots; }
  get slotCount() { return this.slots.length; }

  clear() { this.slots = []; this.equipment.clear(); this._notify(); }

  onChange(fn) { this._onChange.push(fn); }
  onItemUse(fn) { this._onUse.push(fn); }
  _notify() { this._onChange.forEach(fn => fn(this.slots)); }

  toJSON() { return { slots: this.slots, equipment: [...this.equipment.entries()] }; }
  fromJSON(data) {
    if (data.slots) this.slots = data.slots;
    if (data.equipment) data.equipment.forEach(([k, v]) => this.equipment.set(k, v));
  }
}
