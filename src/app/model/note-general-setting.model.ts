export interface NoteGeneralSetting {
  autoSave: boolean;
  showTitle: boolean;
  enableSpellCheck: boolean;
  editorEnableLineNumber: boolean;
  editorTheme: string;
}

export const DEFAULT_NOTE_GENERAL_SETTING: NoteGeneralSetting = {
  autoSave: true,
  showTitle: false,
  enableSpellCheck: false,
  editorEnableLineNumber: false,
  editorTheme: 'material-darker'
};
