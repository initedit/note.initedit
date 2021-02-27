import { NoteTabUiModel } from "./note-tab-ui-model";

export class NoteResponseModel {
  public code: number;
  public content: NoteTabUiModel[];
  public error: string;
  public message: string;
  public request_at: number;
  public info: NoteResponseInfoModel
}
export class SingleNoteResponseModel {
  public code: number;
  public content: NoteTabUiModel;
  public error: string;
  public message: string;
  public request_at: number;
  public info: NoteResponseInfoModel
}
export class NoteResponseInfoModel {
  public created_on: number;
  public type: string;
  public slug: string;

}
