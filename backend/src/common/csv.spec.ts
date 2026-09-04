import { csvCell, toCsv } from './csv';

describe('csvCell', () => {
  it('quotes plain values', () => {
    expect(csvCell('miner@example.com')).toBe('"miner@example.com"');
    expect(csvCell(42)).toBe('"42"');
  });

  it('renders null and undefined as an empty field', () => {
    expect(csvCell(null)).toBe('""');
    expect(csvCell(undefined)).toBe('""');
  });

  it('escapes embedded quotes instead of breaking the row', () => {
    // A KYC full name is user-supplied; without doubling the quote this
    // shifts every column after it.
    expect(csvCell('Ana "Ace" Rios')).toBe('"Ana ""Ace"" Rios"');
  });

  it('defuses spreadsheet formulas', () => {
    // Anyone can register an address that starts with one of these.
    for (const payload of ['=1+1', '+1', '-1', '@SUM(A1)']) {
      expect(csvCell(payload)).toBe(`"'${payload}"`);
    }
  });

  it('leaves an interior = alone', () => {
    expect(csvCell('a=b')).toBe('"a=b"');
  });

  it('serialises dates as ISO', () => {
    expect(csvCell(new Date('2026-09-04T00:00:00.000Z'))).toBe(
      '"2026-09-04T00:00:00.000Z"',
    );
  });
});

describe('toCsv', () => {
  it('quotes every header and cell', () => {
    expect(toCsv(['Email', 'Points'], [['a@b.com', 10]])).toBe(
      '"Email","Points"\n"a@b.com","10"',
    );
  });
});
