import {getGlobal} from "@/components/utils";

let db = require('knex')({
    client: 'sqlite3',
    connection: {
        filename: path.join(getGlobal('userPath'), 'db.db')
    }
});
export default db;
