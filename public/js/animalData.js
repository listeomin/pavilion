// public/js/animalData.js
import { CONFIG } from './config.js?v=6';

export class AnimalData {
  constructor() {
    this.kind = null;
    this.arial = null;
    this.role = null;
    this.lifecycle = null;
  }

  async loadAll() {
    const [kind, arial, role, lifecycle] = await Promise.all([
      fetch(`${CONFIG.BASE_PATH}/data/bestiary/kind.json`).then(r => r.json()),
      fetch(`${CONFIG.BASE_PATH}/data/bestiary/arial.json`).then(r => r.json()),
      fetch(`${CONFIG.BASE_PATH}/data/bestiary/role.json`).then(r => r.json()),
      fetch(`${CONFIG.BASE_PATH}/data/bestiary/lifecycle.json`).then(r => r.json())
    ]);

    this.kind = kind;
    this.arial = arial;
    this.role = role;
    this.lifecycle = lifecycle;
  }

  getAnimalByEmoji(emoji) {
    return this.kind.animals.find(a => a.emoji === emoji);
  }

  getRandomName(emoji) {
    const animal = this.getAnimalByEmoji(emoji);
    if (!animal || !animal.names.length) return null;
    return animal.names[Math.floor(Math.random() * animal.names.length)];
  }

  getFilteredCategories(dataSet, emoji) {
    return dataSet.categories.filter(cat => {
      if (cat.animals.includes('all')) return true;
      return cat.animals.includes(emoji);
    });
  }

  getArials(emoji) {
    return this.getFilteredCategories(this.arial, emoji);
  }

  getRoles(emoji) {
    return this.getFilteredCategories(this.role, emoji);
  }

  getLifecycles(emoji) {
    return this.getFilteredCategories(this.lifecycle, emoji);
  }

  getAllAnimals() {
    return this.kind.animals;
  }
}
