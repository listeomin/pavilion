// public/js/message-history.js
export class MessageHistory {
  constructor() {
    this.messages = []; // [{text, author, metadata, messageId}]
    this.currentIndex = -1; // -1 = not browsing history
    this.editingMessageId = null; // Track which message we're editing
  }

  // Save sent message to history
  addMessage(text, author, metadata = null, messageId = null) {
    this.messages.push({ text, author, metadata, messageId });
    this.currentIndex = -1; // Reset browsing position
  }

  // Navigate to previous message (arrow up)
  // Returns null if no history or if message author differs from current author
  getPrevious(currentAuthor) {
    if (this.messages.length === 0) return null;

    // If not browsing yet, start from the end
    if (this.currentIndex === -1) {
      this.currentIndex = this.messages.length - 1;
    } else if (this.currentIndex > 0) {
      this.currentIndex--;
    } else {
      return null; // Already at the oldest message
    }

    const msg = this.messages[this.currentIndex];
    
    // Check if message belongs to current author
    if (msg.author !== currentAuthor) {
      return null;
    }

    return msg;
  }

  // Navigate to next message (arrow down)
  // Always clears field when called (Telegram-style behavior)
  getNext() {
    this.currentIndex = -1;
    return { clear: true };
  }

  // Reset browsing position
  reset() {
    this.currentIndex = -1;
  }

  // Get last message for current author
  getLastForAuthor(author) {
    for (let i = this.messages.length - 1; i >= 0; i--) {
      if (this.messages[i].author === author) {
        const msg = this.messages[i];
        this.editingMessageId = msg.messageId;
        return msg;
      }
    }
    return null;
  }

  // Check if currently editing a message
  isEditing() {
    return this.editingMessageId !== null;
  }

  // Get message ID being edited
  getEditingMessageId() {
    return this.editingMessageId;
  }

  // Clear editing state
  clearEditing() {
    this.editingMessageId = null;
  }
}
