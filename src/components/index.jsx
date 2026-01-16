import React from 'react';
import { createRoot } from 'react-dom/client';
import DatePickerComponent from './DatePickerWrapper.jsx';

// Import Tailwind CSS with HeroUI styles
import './styles.css';

// Store for React roots to properly unmount
const roots = new Map();

/**
 * Render HeroUI DatePicker into a DOM container
 * @param {HTMLElement} container - DOM element to render into
 * @param {Object} options - DatePicker options
 * @param {string} options.value - Initial date value (ISO string YYYY-MM-DD)
 * @param {Function} options.onChange - Callback when date changes (receives ISO string)
 * @param {string} options.label - Label text
 * @param {string} options.placeholder - Placeholder text
 * @param {string} options.minValue - Minimum allowed date
 * @param {string} options.maxValue - Maximum allowed date
 * @param {boolean} options.isDisabled - Whether the picker is disabled
 * @returns {Function} Cleanup function to unmount the component
 */
function renderDatePicker(container, options = {}) {
  if (!container) {
    console.error('[HeroUI] Container element is required');
    return () => {};
  }

  // Unmount existing root if any
  if (roots.has(container)) {
    roots.get(container).unmount();
  }

  const root = createRoot(container);
  roots.set(container, root);

  const { value, onChange, label, placeholder, minValue, maxValue, isDisabled } = options;

  root.render(
    <DatePickerComponent
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
      minValue={minValue}
      maxValue={maxValue}
      isDisabled={isDisabled}
    />
  );

  // Return cleanup function
  return () => {
    if (roots.has(container)) {
      roots.get(container).unmount();
      roots.delete(container);
    }
  };
}

/**
 * Update an existing DatePicker with new props
 * @param {HTMLElement} container - DOM element with the DatePicker
 * @param {Object} options - New options to apply
 */
function updateDatePicker(container, options = {}) {
  if (!roots.has(container)) {
    console.warn('[HeroUI] No DatePicker found in container, rendering new one');
    return renderDatePicker(container, options);
  }

  const root = roots.get(container);
  const { value, onChange, label, placeholder, minValue, maxValue, isDisabled } = options;

  root.render(
    <DatePickerComponent
      value={value}
      onChange={onChange}
      label={label}
      placeholder={placeholder}
      minValue={minValue}
      maxValue={maxValue}
      isDisabled={isDisabled}
    />
  );
}

/**
 * Unmount DatePicker from container
 * @param {HTMLElement} container - DOM element with the DatePicker
 */
function unmountDatePicker(container) {
  if (roots.has(container)) {
    roots.get(container).unmount();
    roots.delete(container);
  }
}

// Expose to global window object for vanilla JS usage
window.HeroUI = {
  renderDatePicker,
  updateDatePicker,
  unmountDatePicker,
};

export { renderDatePicker, updateDatePicker, unmountDatePicker };
