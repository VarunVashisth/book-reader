// @ts-expect-error Node types are intentionally not part of the browser build.
import { readFile } from 'node:fs/promises';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

describe('selectable PDF fixture', () => {
  it('exposes real multi-line text and a searchable second page', async () => {
    const data = new Uint8Array(await readFile('src/test/fixtures/selectable-text.pdf'));
    const loadingTask = getDocument({ data });
    const document = await loadingTask.promise;
    const first = await (await document.getPage(1)).getTextContent();
    const second = await (await document.getPage(2)).getTextContent();
    const firstText = first.items.map((item) => 'str' in item ? item.str : '').join(' ');
    const secondText = second.items.map((item) => 'str' in item ? item.str : '').join(' ');
    expect(firstText).toContain('real embedded text for selection testing');
    expect(firstText).toContain('accurate multi-line selection');
    expect(secondText).toContain('lighthouse reading garden');
    await loadingTask.destroy();
  });
});
