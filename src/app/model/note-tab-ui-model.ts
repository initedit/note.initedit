import { NoteTabCreateRequestModel } from "./note-tab-create-request-model";

export class NoteTabUiModel extends NoteTabCreateRequestModel {
        public modifiedContent:boolean;
        public modifiedTitle:boolean;
        public modifiedVisibility:boolean;
        public modifiedOrder:boolean;
        public isTitleEnabled:boolean=false;

}
