const { transformSource } = require('../simpleFormat');

test('rewrites plain moment().format YYYY-MM-DD', () => {
  const input = "return moment(date).format('YYYY-MM-DD');";
  const { code, changes } = transformSource(input);
  expect(changes).toBeGreaterThan(0);
  expect(code).toContain('format(');
  expect(code).toContain('yyyy-MM-dd');
});

test('leaves risky Do token alone', () => {
  const input = "return moment(date).format('MMMM Do YYYY');";
  const { code, changes } = transformSource(input);
  expect(changes).toBe(0);
  expect(code).toContain("moment(date).format('MMMM Do YYYY')");
});
