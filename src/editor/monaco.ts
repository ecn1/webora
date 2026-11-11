import * as monaco from 'monaco-editor';
import { loader } from '@monaco-editor/react';
import EditorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker';
import JsonWorker from 'monaco-editor/esm/vs/language/json/json.worker?worker';
import CssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker';
import HtmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker';
import TsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker';

/**
 * Monaco is bundled locally so the code studio works fully offline.
 * The default @monaco-editor/react loader pulls from a CDN, which we must avoid.
 */
(self as any).MonacoEnvironment = {
  getWorker(_moduleId: string, label: string) {
    switch (label) {
      case 'json':
        return new JsonWorker();
      case 'css':
      case 'scss':
      case 'less':
        return new CssWorker();
      case 'html':
      case 'handlebars':
      case 'razor':
        return new HtmlWorker();
      case 'typescript':
      case 'javascript':
        return new TsWorker();
      default:
        return new EditorWorker();
    }
  },
};

loader.config({ monaco });

const THEME = 'webora-dark';

monaco.editor.defineTheme(THEME, {
  base: 'vs-dark',
  inherit: true,
  rules: [
    { token: 'tag', foreground: 'c4a7ff' },
    { token: 'attribute.name', foreground: '8be9c6' },
    { token: 'attribute.value', foreground: 'e8c78a' },
    { token: 'string', foreground: 'e8c78a' },
    { token: 'number', foreground: 'f0a97c' },
    { token: 'keyword', foreground: 'a78bfa' },
    { token: 'comment', foreground: '5b5b73', fontStyle: 'italic' },
    { token: 'delimiter', foreground: '8f8fa9' },
    { token: 'type', foreground: '7dd3fc' },
    { token: 'variable', foreground: 'e2e2ef' },
  ],
  colors: {
    'editor.background': '#0b0b12',
    'editor.foreground': '#dcdcea',
    'editorLineNumber.foreground': '#3f3f54',
    'editorLineNumber.activeForeground': '#9a9ab2',
    'editorCursor.foreground': '#a78bfa',
    'editor.selectionBackground': '#3a2f66',
    'editor.inactiveSelectionBackground': '#2a2348',
    'editor.lineHighlightBackground': '#12121d',
    'editorIndentGuide.background1': '#1c1c2b',
    'editorIndentGuide.activeBackground1': '#2f2f45',
    'editorWidget.background': '#12121d',
    'editorWidget.border': '#26263a',
    'editorSuggestWidget.background': '#12121d',
    'editorSuggestWidget.selectedBackground': '#241d3d',
    'scrollbarSlider.background': '#26263a80',
    'scrollbarSlider.hoverBackground': '#34345a99',
    'minimap.background': '#0b0b12',
  },
});

export { monaco, THEME };
