// "mongodb+srv://user:secret@host/db" -> "mongodb+srv://user:***@host/db", so a connection error can be logged
// without putting the database password in the host's logs. A URI without a password comes back unchanged.
export function hidePassword(uri) {
    return String(uri).replace(/^([a-z][a-z0-9+.-]*:\/\/[^:/@]*):[^@/]*@/i, "$1:***@");
}
