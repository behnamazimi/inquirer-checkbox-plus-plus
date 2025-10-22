// Test CommonJS build
const checkboxPlus = require('./dist/index.cjs');

console.log('CommonJS import successful:', typeof checkboxPlus);

// Test basic functionality
const testConfig = {
  message: 'Test prompt',
  source: async () => [
    { name: 'Option 1', value: 'opt1' },
    { name: 'Option 2', value: 'opt2' }
  ]
};

console.log('CommonJS test passed!');
