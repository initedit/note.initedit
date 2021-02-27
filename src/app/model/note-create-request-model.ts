import { NoteTabUiModel } from "./note-tab-ui-model";

export class NoteCreateRequestModel {
        public name:string;
        public password:string;
        public type:string;
}

export class NoteCreateRequestWithTabsModel extends NoteCreateRequestModel {
  public items:NoteTabUiModel[];
}
