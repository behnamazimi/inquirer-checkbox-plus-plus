/**
 * Checkbox Plus Example
 * 
 * @author Mohammad Fares <faressoft.com@gmail.com>
 * @author Behnam (fork maintainer)
 */

import fuzzy from 'fuzzy';
import checkboxPlus from 'inquirer-checkbox-plus-plus';

const colors = [
  { name: 'The red color', value: 'red', short: 'red', disabled: false },
  { name: 'The blue color', value: 'blue', short: 'blue', disabled: true },
  { name: 'The green color', value: 'green', short: 'green', disabled: false },
  { name: 'The yellow color', value: 'yellow', short: 'yellow', disabled: false },
  { name: 'The black color', value: 'black', short: 'black', disabled: false },
  { name: 'The white color', value: 'white', short: 'white', disabled: false },
  { name: 'The purple color', value: 'purple', short: 'purple', disabled: false },
  { name: 'The orange color', value: 'orange', short: 'orange', disabled: false },
  { name: 'The pink color', value: 'pink', short: 'pink', disabled: false },
];

try {
  const answers = await checkboxPlus({
    message: 'Select colors',
    pageSize: 10,
    highlight: true,
    searchable: true,
    default: ['yellow', 'red', { name: 'black' }],
    validate: function(answer) {
      if (answer.length == 0) {
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

  console.log('Selected colors:', answers);
} catch (error) {
  console.error('Error:', error.message);
}