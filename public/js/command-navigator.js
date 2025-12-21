// public/js/command-navigator.js
export class CommandNavigator {
  constructor(commands = ['/music', '/rebase']) {
    this.commands = commands;
    this.currentIndex = -1;
  }

  next() {
    if (this.commands.length === 0) return null;
    
    this.currentIndex = (this.currentIndex + 1) % this.commands.length;
    return this.commands[this.currentIndex];
  }

  prev() {
    if (this.commands.length === 0) return null;
    
    this.currentIndex = this.currentIndex <= 0 
      ? this.commands.length - 1 
      : this.currentIndex - 1;
    return this.commands[this.currentIndex];
  }

  getCurrentCommand() {
    if (this.currentIndex === -1) return null;
    return this.commands[this.currentIndex];
  }

  reset() {
    this.currentIndex = -1;
  }
}
