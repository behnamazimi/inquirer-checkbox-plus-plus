/**
 * Checkbox Plus Prompt for @inquirer/prompts
 * Production-ready implementation with improved error handling and performance
 *
 * @author Mohammad Fares <faressoft.com@gmail.com>
 * @author Behnam (fork maintainer) <@behnamazimi>
 */

import {
  createPrompt,
  useState,
  useKeypress,
  usePrefix,
  usePagination,
  useMemo,
  useEffect,
  makeTheme,
  isUpKey,
  isDownKey,
  isSpaceKey,
  isEnterKey,
  ValidationError,
  Separator,
} from '@inquirer/core';
import { cursorHide } from '@inquirer/ansi';
import colors from 'yoctocolors-cjs';
import figures from '@inquirer/figures';
import pkg from 'lodash';
const { isEqual } = pkg;

// Constants
const DEFAULT_PAGE_SIZE = 7;
const MAX_SEARCH_LENGTH = 100;

// Theme configuration
const checkboxPlusTheme = {
  icon: {
    checked: colors.green(figures.radioOn),
    unchecked: figures.radioOff,
    disabled: colors.dim(figures.radioOff),
    cursor: figures.pointer,
  },
  style: {
    disabledChoice: (text) => colors.dim(text),
    renderSelectedChoices: (selectedChoices) => selectedChoices.map((choice) => choice.short).join(', '),
    description: (text) => colors.cyan(text),
    keysHelpTip: (keys) => keys
      .map(([key, action]) => `${colors.bold(key)} ${colors.dim(action)}`)
      .join(colors.dim(' • ')),
    highlight: (text) => colors.gray(text),
    searching: (text) => colors.cyan(text),
    searchHint: (text) => colors.dim(colors.cyan(text)),
    noResults: (text) => colors.yellow(text),
    error: (text) => colors.red(text),
    activeItem: (text) => colors.blue(text),
  },
  helpMode: 'always',
  keybindings: [],
};

// Utility functions
const validateSearchInput = (input) => {
  if (typeof input !== 'string') return false;
  if (input.length > MAX_SEARCH_LENGTH) return false;
  return /^[A-Za-z0-9.\-_]*$/.test(input);
};

const createErrorHandler = (setError, setLoading, enableLogging = true) => (error) => {
  const message = error?.message || 'An unexpected error occurred';
  setError(message);
  setLoading(false);
  if (enableLogging) {
    console.error('[checkbox-plus] Error:', error);
  }
};

function isSelectable(item) {
  return item && !Separator.isSeparator(item) && !item.disabled;
}

function isChecked(item) {
  return isSelectable(item) && item.checked;
}

function toggle(item) {
  return isSelectable(item) ? { ...item, checked: !item.checked } : item;
}

function check(checked) {
  return function (item) {
    return isSelectable(item) ? { ...item, checked } : item;
  };
}

function normalizeChoices(choices) {
  if (!Array.isArray(choices)) {
    throw new Error('Choices must be an array');
  }

  return choices.map((choice, index) => {
    if (Separator.isSeparator(choice)) {
      return choice;
    }
    
    if (typeof choice === 'string') {
      return {
        value: choice,
        name: choice,
        short: choice,
        checkedName: choice,
        disabled: false,
        checked: false,
      };
    }
    
    if (typeof choice !== 'object' || choice === null) {
      throw new Error(`Invalid choice at index ${index}: must be string, object, or separator`);
    }
    
    if (choice.value === undefined || choice.value === null) {
      throw new Error(`Choice at index ${index} must have a value property`);
    }
    
    const name = choice.name ?? String(choice.value);
    const normalizedChoice = {
      value: choice.value,
      name,
      short: choice.short ?? name,
      checkedName: choice.checkedName ?? name,
      disabled: Boolean(choice.disabled),
      checked: Boolean(choice.checked),
    };
    
    if (choice.description) {
      normalizedChoice.description = String(choice.description);
    }
    
    return normalizedChoice;
  });
}

function mergeWithExistingState(newItems, selectedItemsMap) {
  // Merge new items with global selected state
  return newItems.map(newItem => {
    if (Separator.isSeparator(newItem)) {
      return newItem;
    }
    
    if (isSelectable(newItem)) {
      // Check if this item is in our global selected state
      const isSelected = selectedItemsMap.has(newItem.value);
      return { ...newItem, checked: isSelected };
    }
    
    return newItem;
  });
}

/**
 * Checkbox Plus Prompt for @inquirer/prompts
 * 
 * A modern checkbox prompt with search/filter capabilities, highlighting,
 * and improved UX for the latest Inquirer.js ecosystem.
 * 
 * @param {Object} config - Configuration object
 * @param {string} config.message - The question to display
 * @param {Function} config.source - Async function that returns choices based on search input
 * @param {boolean} [config.searchable=false] - Whether to enable search/filtering
 * @param {boolean} [config.highlight=false] - Whether to highlight the currently selected choice
 * @param {Array} [config.default=[]] - Default selected values
 * @param {Function} [config.validate] - Validation function for selected values
 * @param {number} [config.pageSize=7] - Number of choices to show per page
 * @param {boolean} [config.loop=true] - Whether to loop through choices when navigating
 * @param {boolean} [config.required=false] - Whether at least one choice must be selected
 * @param {string|false} [config.instructions] - Custom instructions to display
 * @param {Object} [config.theme] - Custom theme overrides
 * @param {boolean} [config.enableErrorLogging=true] - Whether to enable error logging
 * @param {Object} [config.answers] - Previous answers in the prompt chain
 * @param {Function} done - Callback function to call when prompt is complete
 * @returns {void}
 * 
 * @example
 * ```js
 * import checkboxPlus from 'inquirer-checkbox-plus-plus';
 * 
 * const answers = await checkboxPlus({
 *   message: 'Select colors',
 *   searchable: true,
 *   source: async (answers, input) => {
 *     // Return filtered choices based on input
 *     return filteredChoices;
 *   }
 * });
 * ```
 */
const checkboxPlusPrompt = createPrompt((config, done) => {
  // Input validation
  if (!config) {
    throw new ValidationError('[checkbox-plus prompt] Configuration is required');
  }
  
  if (!config.source || typeof config.source !== 'function') {
    throw new ValidationError('[checkbox-plus prompt] source function is required');
  }

  const {
    instructions,
    pageSize = DEFAULT_PAGE_SIZE,
    loop = true,
    required = false,
    validate = () => true,
    source,
    searchable = false,
    highlight = false,
    default: defaultValues = [],
  } = config;

  // Validate default values
  if (!Array.isArray(defaultValues)) {
    throw new ValidationError('[checkbox-plus prompt] default values must be an array');
  }

  const theme = makeTheme(checkboxPlusTheme, config.theme);
  const { keybindings } = theme;

  const [status, setStatus] = useState('idle');
  const [items, setItems] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setError] = useState();
  const [selectedItems, setSelectedItems] = useState(new Map());

  const prefix = usePrefix({ status, theme });
  
  // Create error handler
  const handleError = createErrorHandler(setError, setLoading, config.enableErrorLogging !== false);

  // Immediate search function
  const performSearch = async (query) => {
    if (!source) return;
    
    try {
      setLoading(true);
      setError(undefined);
      
      const choices = await source(config.answers || {}, query);
      const normalizedChoices = normalizeChoices(choices);
      const mergedItems = mergeWithExistingState(normalizedChoices, selectedItems);
      
      setItems(mergedItems);
      setLoading(false);
    } catch (error) {
      handleError(error);
    }
  };

  // Initialize items from source - only run once on mount
  useEffect(() => {
    if (!source) return;
    
    const initializeItems = async () => {
      try {
        setLoading(true);
        setError(undefined);
        
        const choices = await source(config.answers || {}, '');
        const normalizedChoices = normalizeChoices(choices);
        
        // Apply default values and populate global selected state
        const initialSelectedItems = new Map();
        const itemsWithDefaults = normalizedChoices.map(choice => {
          if (isSelectable(choice)) {
            const isDefault = defaultValues.some(defaultVal => 
              isEqual(choice.value, defaultVal) || 
              (typeof defaultVal === 'object' && isEqual(choice.name, defaultVal.name))
            );
            const choiceWithDefault = { ...choice, checked: isDefault };
            if (isDefault) {
              initialSelectedItems.set(choice.value, choiceWithDefault);
            }
            return choiceWithDefault;
          }
          return choice;
        });
        
        setSelectedItems(initialSelectedItems);
        setItems(itemsWithDefaults);
        setLoading(false);
      } catch (error) {
        handleError(error);
      }
    };
    
    initializeItems();
  }, [defaultValues]);

  const bounds = useMemo(() => {
    const first = items.findIndex(isSelectable);
    const last = items.findLastIndex(isSelectable);
    if (first === -1) {
      return { first: 0, last: 0 };
    }
    return { first, last };
  }, [items]);

  const [active, setActive] = useState(() => bounds.first);

  useKeypress(async (key) => {
    try {
      // Handle special keys first (these should always work regardless of searchable mode)
      if (isEnterKey(key)) {
        const selection = Array.from(selectedItems.values());
        
        if (required && selectedItems.size === 0) {
          setError('At least one choice must be selected');
          return;
        }
        
        try {
          const isValid = await validate(selection.map(choice => choice.value));
          if (isValid === true) {
            setStatus('done');
            done(selection.map((choice) => choice.value));
          } else {
            setError(isValid || 'You must select a valid value');
          }
        } catch (validationError) {
          setError(validationError.message || 'Validation failed');
        }
        return;
      }
      
      if (isUpKey(key, keybindings) || isDownKey(key, keybindings)) {
        if (items.length === 0) return;
        
        if (loop ||
            (isUpKey(key, keybindings) && active !== bounds.first) ||
            (isDownKey(key, keybindings) && active !== bounds.last)) {
          const offset = isUpKey(key, keybindings) ? -1 : 1;
          let next = active;
          do {
            next = (next + offset + items.length) % items.length;
          } while (next !== active && (next < 0 || next >= items.length || !isSelectable(items[next])));
          
          // Ensure next is within bounds before setting
          if (next >= 0 && next < items.length) {
            setActive(next);
          }
        }
        return;
      }
      
      // Handle space key for selection - ALWAYS first priority
      const isSpace = isSpaceKey(key) || key.name === 'space' || key.name === ' ' || key.sequence === ' ';
      if (isSpace) {
        setError(undefined);
        
        const activeItem = items[active];
        if (isSelectable(activeItem)) {
          const toggledItem = toggle(activeItem);
          const newSelectedItems = new Map(selectedItems);
          
          if (toggledItem.checked) {
            newSelectedItems.set(activeItem.value, toggledItem);
          } else {
            newSelectedItems.delete(activeItem.value);
          }
          
          setSelectedItems(newSelectedItems);
          setItems(items.map((choice, i) => (i === active ? toggledItem : choice)));
        }
        return;
      }
      
      // Handle searchable text input
      if (searchable && key.name && key.name.length === 1 && !key.ctrl && !key.meta) {
        if (!isSpace && validateSearchInput(key.name)) {
          setError(undefined);
          const newQuery = searchQuery + key.name;
          setSearchQuery(newQuery);
          performSearch(newQuery);
          return;
        }
      }
      
      if (searchable && key.name === 'backspace') {
        setError(undefined);
        const newQuery = searchQuery.slice(0, -1);
        setSearchQuery(newQuery);
        performSearch(newQuery);
        return;
      }
    } catch (error) {
      handleError(error);
    }
  });

  const baseMessage = theme.style.message(config.message, status);
  const searchIndicator = searchable && searchQuery && searchQuery.length > 0 ? theme.style.searchHint(` [searching: "${searchQuery}"]`) : '';
  const message = baseMessage + searchIndicator;

  let description;
  const page = usePagination({
    items,
    active,
    renderItem({ item, isActive }) {
      if (Separator.isSeparator(item)) {
        return ` ${item.separator}`;
      }
      if (item.disabled) {
        const disabledLabel = typeof item.disabled === 'string' ? item.disabled : '(disabled)';
        const checkbox = theme.icon.disabled;
        const name = item.checked ? item.checkedName : item.name;
        const cursor = isActive ? theme.icon.cursor : ' ';
        const text = `${name} ${disabledLabel}`;
        return `${cursor}${checkbox} ${isActive ? theme.style.activeItem(text) : theme.style.disabledChoice(text)}`;
      }
      if (isActive) {
        description = item.description;
      }
      const checkbox = item.checked ? theme.icon.checked : theme.icon.unchecked;
      const name = item.checked ? item.checkedName : item.name;
      const cursor = isActive ? theme.icon.cursor : ' ';
      const text = `${checkbox} ${name}`;
      return isActive ? theme.style.activeItem(`${cursor}${text}`) : `${cursor}${text}`;
    },
    pageSize,
    loop,
  });

  if (status === 'done') {
    const selection = Array.from(selectedItems.values());
    const answer = theme.style.answer(theme.style.renderSelectedChoices(selection, items));
    return [prefix, message, answer].filter(Boolean).join(' ');
  }

  let helpLine;
  if (theme.helpMode !== 'never' && instructions !== false) {
    if (typeof instructions === 'string') {
      helpLine = instructions;
    } else {
      // Always show navigation hints, add search info when searching
      const keys = [
        ['↑↓', 'navigate'],
        ['space', 'de/select'],
      ];
      if (searchable) {
        keys.push(['type', 'search']);
      }
      const selectedCount = selectedItems.size;
      if (selectedCount > 0) {
        keys.push([`${selectedCount} selected`, '']);
      }
      keys.push(['⏎', 'submit']);
      helpLine = theme.style.keysHelpTip(keys);
    }
  }

  const lines = [
    [prefix, message].filter(Boolean).join(' '),
    loading && searchable && searchQuery ? theme.style.searchHint(`Searching for "${searchQuery}"  | • ⌫ backspace`) : (loading ? theme.style.searching('Searching...') : ''),
    errorMsg ? theme.style.error(errorMsg) : '',
    !loading && items.length === 0 ? theme.style.noResults('No results found • ⌫ backspace') : '',
    page,
    ' ',
    description ? theme.style.description(description) : '',
    helpLine,
  ]
    .filter(Boolean)
    .join('\n')
    .trimEnd();

  return `${lines}${cursorHide}`;
});

export default checkboxPlusPrompt;
export { Separator } from '@inquirer/core';