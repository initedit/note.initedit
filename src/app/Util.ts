import { NoteService } from "./note.service";

var aesjs = require("aes-js")

export default class Utils {
        private static noteService:NoteService;
        constructor(private noteService:NoteService){
                Utils.noteService=noteService;
        }


        static noteEncrypt(slug:string,text:string, passKey?:string) { 
                // An example 128-bit key (16 bytes * 8 bits/byte = 128 bits)
                var key = Utils.getNoteKey(slug);
                if (passKey !== undefined)
                {
                        key = Utils.getNormalizeKey(Utils.normalizeKey(passKey));
                }

                // Convert text to bytes    
                var textBytes = aesjs.utils.utf8.toBytes(text);

                // The counter is optional, and if omitted will begin at 1
                var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
                var encryptedBytes = aesCtr.encrypt(textBytes);

                // To print or store the binary data, you may convert it to hex
                var encryptedHex = aesjs.utils.hex.fromBytes(encryptedBytes);
                return encryptedHex;

         }
         static noteDecrypt(slug:string,text:string, passKey?:string) {
                // An example 128-bit key (16 bytes * 8 bits/byte = 128 bits)
                var key = Utils.getNoteKey(slug);
                if (passKey !== undefined)
                {
                        key = Utils.getNormalizeKey(Utils.normalizeKey(passKey));
                }
                var encryptedHex = text;
            // When ready to decrypt the hex string, convert it back to bytes
                var encryptedBytes = aesjs.utils.hex.toBytes(encryptedHex);
            
            // The counter mode of operation maintains internal state, so to
            // decrypt a new instance must be instantiated.
                var aesCtr = new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(5));
                var decryptedBytes = aesCtr.decrypt(encryptedBytes);
            
            // Convert our bytes back into text
                var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);
            // "Text may be any length you wish, no padding is required."
            
                return decryptedText;
         }

         

         static normalizeKey(pass:string):string {
                while (pass.length < 16) {
                    pass = "0" + pass;
                }
                pass = pass.substr(0, 16);
                return pass;
        }
        static getNormalizeKey(pass:string):any {
                return aesjs.utils.utf8.toBytes(pass);
        }
        static getNoteKey(slug:string) {
                return Utils.getNormalizeKey(localStorage.getItem(slug+"_PASS"));        
        }
}