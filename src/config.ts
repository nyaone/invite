import { createRequire } from "module";
const require = createRequire(import.meta.url);
let config = require("../config.json");
interface Config {
    misskey: {
        url: string,
        token: string,
    },
    invite: {
        coolDown: number,
    }
}

export default config as Config;
