export type EditorTypeCode = 'graphic' | 'document' | 'whiteboard' | 'form';

export interface EditorTypeConstant {
  id: number;
  type: EditorTypeCode;
}

export const EDITOR_TYPES: EditorTypeConstant[] = [
  { id: 0, type: 'graphic' },
  { id: 1, type: 'document' },
  { id: 2, type: 'whiteboard' },
  { id: 3, type: 'form' },
];

export const EDITOR_TYPE_IDS = EDITOR_TYPES.map((item) => item.id);

export function getEditorTypeById(id: number): EditorTypeConstant | undefined {
  return EDITOR_TYPES.find((item) => item.id === id);
}

export function getEditorTypeByCode(code: string): EditorTypeConstant | undefined {
  return EDITOR_TYPES.find((item) => item.type === code);
}