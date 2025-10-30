# Inquirer Checkbox Plus Plus

A modern dual-package (ESM + CommonJS) plugin for [@inquirer/prompts](https://github.com/SBoudrias/Inquirer.js), similar to the original checkbox with extra features like searchable filtering and highlighting.

[![npm](https://img.shields.io/npm/v/inquirer-checkbox-plus-plus.svg)](https://www.npmjs.com/package/inquirer-checkbox-plus-plus)
[![npm](https://img.shields.io/npm/l/inquirer-checkbox-plus-plus.svg)](https://github.com/behnamazimi/inquirer-checkbox-plus-plus/blob/master/LICENSE)

<p align="center">
  <img width="500" src="/demo.gif?raw=true">
  <br>
  <span>The animated GIF is made by <a href="https://github.com/faressoft/terminalizer">Terminalizer</a></span>
</p>

## About This Fork

This package is a **maintained fork** of [`inquirer-checkbox-plus-prompt`](https://github.com/faressoft/inquirer-checkbox-plus-prompt), modernized for the latest Inquirer.js ecosystem with added ESM support.

### Why a New Package?

The original `inquirer-checkbox-plus-prompt` hasn't been updated for modern `@inquirer/core`. This fork provides:

- ✅ Works with @inquirer/core v10+
- ✅ Supports both ESM and CommonJS
- ✅ Actively maintained
- ✅ Improved error handling and UX
- ✅ Standalone usage (no prompt registration needed)

### Migrating from `inquirer-checkbox-plus-prompt`

If you're coming from the original package, see the [Migration Guide](#migration-from-inquirer-checkbox-plus-prompt) below.

## Installation

```bash
npm install inquirer-checkbox-plus-plus
```

**Note**: This package works standalone and includes all necessary dependencies.

## Usage

### ESM (Recommended)

```js
import checkboxPlus from 'inquirer-checkbox-plus-plus';

const answers = await checkboxPlus({
  message: 'Select colors',
  searchable: true,
  source: async (answers, input) => {
    // Your async source logic here
    return choices;
  }
});
```

### CommonJS

```js
const checkboxPlus = require('inquirer-checkbox-plus-plus');

const answers = await checkboxPlus({
  message: 'Select colors',
  searchable: true,
  source: async (answers, input) => {
    return choices;
  }
});
```

## Options

### Required Options

- **message**: String - The question to display
- **source**: Function - Async function that returns a promise with choices
  - `source(answersSoFar, input)` where `input` is the search query when searchable
  - Should return an array of choice objects or strings

### Optional Options

- **searchable**: Boolean - Enable search/filtering functionality (default: false)
- **highlight**: Boolean - Highlight the currently selected choice (default: false)
- **default**: Array - Default selected values
- **validate**: Function - Validation function for the selected values
- **pageSize**: Number - Number of choices to show per page (default: 7)
- **loop**: Boolean - Whether to loop through choices when navigating (default: true)
- **required**: Boolean - Whether at least one choice must be selected (default: false)
- **instructions**: String|false - Custom instructions to display
- **theme**: Object - Custom theme overrides
- **enableErrorLogging**: Boolean - Whether to enable error logging (default: true)

### Choice Format

Choices can be strings or objects:

```js
// String format
['red', 'green', 'blue']

// Object format
[
  { name: 'Red Color', value: 'red', short: 'red' },
  { name: 'Green Color', value: 'green', short: 'green', disabled: true },
  { name: 'Blue Color', value: 'blue', short: 'blue', description: 'A cool color' }
]
```

## Example

```js
import checkboxPlus from 'inquirer-checkbox-plus-plus';
import fuzzy from 'fuzzy';

const colors = [
  { name: 'The red color', value: 'red', short: 'red' },
  { name: 'The blue color', value: 'blue', short: 'blue', disabled: true },
  { name: 'The green color', value: 'green', short: 'green' },
  { name: 'The yellow color', value: 'yellow', short: 'yellow' },
  { name: 'The black color', value: 'black', short: 'black' }
];

const answers = await checkboxPlus({
  message: 'Enter colors',
  pageSize: 10,
  highlight: true,
  searchable: true,
  default: ['yellow', 'red'],
  validate: function(answer) {
    if (answer.length === 0) {
      return 'You must choose at least one color.';
    }
    return true;
  },
  source: function(answersSoFar, input) {
    input = input || '';

    return new Promise(function(resolve) {
      const fuzzyResult = fuzzy.filter(input, colors, {
        extract: function(item) {
          return item['name'];
        }
      });

      const data = fuzzyResult.map(function(element) {
        return element.original;
      });

      resolve(data);
    });
  }
});

console.log(answers);
```

### Customizing Theme and Style

```
const answers = await inquirer.prompt([{
  type: 'checkbox-plus',
  name: 'colors',
  message: 'Select colors',
  source: sourceFunction,
  theme: {
    icon: {
      checked: '✓',
      unchecked: '○',
      cursor: '>'
    },
    style: {
      highlight: (text) => `\x1b[1m${text}\x1b[0m`,
      disabledChoice: (text) => `\x1b[2m${text}\x1b[0m`
    }
  }
}]);
```

## Keyboard Shortcuts

- **↑/↓**: Navigate through choices
- **Space**: Toggle selection
- **Enter**: Submit selection
- **Type**: When searchable is enabled, type to filter (only A-Z, a-z, 0-9, ., -, _ allowed)
- **Backspace**: When searchable is enabled, edit search query

**Note**: Space key works for selection even when searchable mode is enabled. Search input only accepts alphanumeric characters, dots, dashes, and underscores.

## Migration from `inquirer-checkbox-plus-prompt`

### 1. Update Dependencies

```bash
# Remove old dependencies
npm uninstall inquirer-checkbox-plus-prompt

# Install new package
npm install inquirer-checkbox-plus-plus
```

### 2. Update Imports

```js
// OLD (inquirer-checkbox-plus-prompt)
const inquirer = require('inquirer');
const checkboxPlus = require('inquirer-checkbox-plus-prompt');

// NEW (inquirer-checkbox-plus-plus) - ESM
import checkboxPlus from 'inquirer-checkbox-plus-plus';

// NEW (inquirer-checkbox-plus-plus) - CommonJS
const checkboxPlus = require('inquirer-checkbox-plus-plus');
```

### 3. Update Usage

The API is now much simpler - no need to register prompts:

```js
// OLD (inquirer-checkbox-plus-prompt)
inquirer.registerPrompt('checkbox-plus', checkboxPlus);
const answers = await inquirer.prompt([{
  type: 'checkbox-plus',
  // ... config
}]);

// NEW (inquirer-checkbox-plus-plus)
const answers = await checkboxPlus({
  // ... config
});
```

## Requirements

- Node.js 18.0.0 or higher
- Works with both ESM and CommonJS environments

## License

This project is under the MIT license.

## Contributing

This is a community-maintained fork. Contributions are welcome!

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Changelog

### v1.0.0 (Initial Release)

🎉 First release of `inquirer-checkbox-plus-plus` (maintained fork of `inquirer-checkbox-plus-prompt`)

- ✨ Complete rewrite for @inquirer/core v10+ compatibility
- ✨ Dual package support (ESM + CommonJS)
- ✨ Improved search functionality and enhanced UX
- ✨ Standalone usage (no prompt registration needed)
- ✨ Better error handling and performance
- ✨ Modern React-like hooks architecture
