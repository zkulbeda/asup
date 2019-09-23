import {getGlobal} from "@/components/utils";
import memoize from 'lodash/memoize'
import path from 'path'

let db = ()=>getGlobal('db');
export default db;
